MAKEFILE_DIR := $(dir $(lastword $(MAKEFILE_LIST)))
BIN := $(MAKEFILE_DIR)bin
export BIN_DIR := $(BIN)
export PATH := $(BIN):$(PATH)
export KUBECONFIG := $(BIN)/kubeconfig
unexport KUBERNETES_SERVICE_PORT
unexport KUBERNETES_SERVICE_HOST
unexport KUBERNETES_PORT

##---------------------------------------------------------------------
##@ help
##---------------------------------------------------------------------
.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-23s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##---------------------------------------------------------------------
##@ Download Binary
##---------------------------------------------------------------------
.PHONY: bin
bin: 
	@mkdir -p $(BIN)

k3d: bin $(BIN)/k3d ## Download k3d
$(BIN)/k3d:
	@echo ====== $@ ======
	export K3D_INSTALL_DIR=$(BIN) && \
	curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash


helm: bin $(BIN)/helm ## Download helm
$(BIN)/helm:
	@echo ====== $@ ======
	export HELM_INSTALL_DIR=$(BIN) && \
	curl -s curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

kubectl: bin $(BIN)/kubectl ## Download kubectl
$(BIN)/kubectl:
	@echo ====== $@ ======
	$(eval KUBE_VER := $(shell curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt))
	curl -L -o $@ "https://storage.googleapis.com/kubernetes-release/release/$(KUBE_VER)/bin/linux/amd64/kubectl"
	chmod +x $@

##---------------------------------------------------------------------
##@ Kubenetes environment
##---------------------------------------------------------------------
.PHONY: create-cluster delete-cluster

CLUSTER_NAME := my-k8s

create-cluster: k3d helm kubectl  ## Create k3s cluster with cert-manager.
	@echo ====== $@ ======
	@k3d cluster list $(CLUSTER_NAME) > /dev/null 2>&1 && echo "This cluster has already been created" ||  { \
		echo ====== create cluster ======= && \
		k3d cluster create $(CLUSTER_NAME) \
			--api-port 43000 \
			-p "15000:80@loadbalancer" \
			--registry-create my-k8s.io:0.0.0.0:5000 \
			--agents 2 \
			--k3s-node-label "failure-domain.beta.kubernetes.io/zone=zone-A@server:0" \
			--k3s-node-label "failure-domain.beta.kubernetes.io/zone=zone-B@agent:0" \
			--k3s-node-label "failure-domain.beta.kubernetes.io/zone=zone-C@agent:1" \
			--k3s-arg "--no-deploy=local-storage@server:*" \
			--k3s-arg "--debug@server:*" \
		&& \
		echo ====== wait traefik ====== && \
		until (kubectl get po -n kube-system -l app.kubernetes.io/instance=traefik | grep traefik) do sleep 2; done ; \
		kubectl wait po -n kube-system -l app.kubernetes.io/instance=traefik --for condition=Ready ; \
		kubectl get po -A ; \
	}

delete-cluster: k3d  ## Delete k3s cluster.
	@echo ====== $@ ======
	-@k3d cluster delete $(CLUSTER_NAME)

##---------------------------------------------------------------------
##@ Docker build
##---------------------------------------------------------------------
.PHONY: docker-build docker-build-k8s-viewer

IMG_K8S-VIEWER_TAG ?= 1.0.0
IMG_K8s-VIEWER_REPOSITORY ?= k8s-viewer
IMG_K8S-VIEWER ?= $(IMG_K8s-VIEWER_REPOSITORY):$(IMG_K8S-VIEWER_TAG)

docker-build: docker-build-k8s-viewer ## Build the docker images.

docker-build-k8s-viewer:  ## Build the docker image for k8s-viewer.
	@echo ====== $@ ======
	DOCKER_BUILDKIT=1 docker build . -t ${IMG_K8S-VIEWER} -f dockerfile/k8s-viewer.Dockerfile #--progress plain
	docker tag ${IMG_K8S-VIEWER} localhost:5000/${IMG_K8S-VIEWER}
	docker push localhost:5000/${IMG_K8S-VIEWER}
	k3d image import localhost:5000/${IMG_K8S-VIEWER} -c $(CLUSTER_NAME)


docker-cache-clear: ## docker cache clear.
	-docker system df
	-docker rmi `docker images -f "dangling=true" -q`
	-docker builder prune

##---------------------------------------------------------------------
##@ Install to k8s
##---------------------------------------------------------------------
.PHONY: install-k8s-viewer uninstall-k8s-viewer

LOGLEVEL ?= info

install-k8s-viewer: helm kubectl create-cluster docker-build-k8s-viewer ## Install k8s-viewer resources.
	@echo ====== $@ ======
	helm upgrade --install k8s-viewer ./charts/k8s-viewer \
		-n k8s-viewer --create-namespace \
		--wait \
		--set image.repository=my-k8s.io:5000/$(IMG_K8s-VIEWER_REPOSITORY) \
		--set image.tag=$(IMG_K8S-VIEWER_TAG) \
		--set image.pullPolicy=Always \
		--set ingress.enabled=true \
		--set ingress.hosts[0].host= \
		--set ingress.hosts[0].paths[0].path=/ \
		--set ingress.hosts[0].paths[0].pathType=Prefix \
		--set insecure=true \
		--set logLevel=$(LOGLEVEL)

uninstall-k8s-viewer: helm  ## Uninstall k8s-viewer resources.
	@echo ====== $@ ======
	-helm uninstall -n k8s-viewer k8s-viewer

##---------------------------------------------------------------------
##@ Demo
##---------------------------------------------------------------------
.PHONY: demo cleanup-demo

demo: ## start demo
	@echo ---------------------------
	@echo  start demo
	@echo ---------------------------
	@bash docmd.sh "kubectl create namespace myapp" ; \
	sleep 1 ;\
	echo "\n## deploy 3pods"; \
	bash docmd.sh "kubectl create deployment -n myapp app-a --image=nginx --replicas=3" ;\
	sleep 5 ;\
	echo "\n## scale up 3->10 pods"; \
	bash docmd.sh "kubectl scale deployment -n myapp app-a --replicas=10" ;\
	sleep 5 ;\
	echo "\n## scale up 3->10 pods"; \
	bash docmd.sh "k3d node create node2 -c $(CLUSTER_NAME) -n k3d-my-k8s " ;\
	sleep 10 ;\
	bash docmd.sh "kubectl create deployment -n myapp app-b --image=nginx --replicas=10 " ;\
	sleep 10 ;\
	bash docmd.sh "kubectl create deployment -n myapp app-c --image=nginx --replicas=10 " ;\
	sleep 10 ;\
	bash docmd.sh "kubectl delete node k3d-node2-0" ;\
	sleep 5 ;\
	bash docmd.sh "k3d node delete k3d-node2-0" ;\
	echo ---------------------------

cleanup-demo: ## clean up demo env
	@echo ---------------------------
	@echo  clean up demo env
	@echo ---------------------------
	-kubectl delete deployment -n myapp app-a > /dev/null
	-kubectl delete deployment -n myapp app-b > /dev/null
	-kubectl delete deployment -n myapp app-c > /dev/null
	-kubectl delete namespace myapp > /dev/null
	-kubectl delete node k3d-node2-0 > /dev/null
	-k3d node delete k3d-node2-0 > /dev/null
	@echo ---------------------------

#--k3s-node-label "failure-domain.beta.kubernetes.io/zone=zone-C@k3d-node2-0
##---------------------------------------------------------------------
##@ Utility
##---------------------------------------------------------------------
.PHONY: console helm-ls k

console: ## Activate kubeconfig for local k8s. 
	@bash --rcfile bashrc

helm-ls: ## helm list.
	@helm list -a -A

k: ## Get k8s resources.
	@docker ps -a
	@kubectl get node -o wide
	@kubectl get po -A
	@kubectl get ing -A
	@kubectl get svc -A
	@kubectl get ep -A
