FROM golang:1.19 as base

ENV GO111MODULE=on

WORKDIR /work

# Copy the Go Modules manifests
COPY go.mod go.mod
COPY go.sum go.sum

# cache deps before building and copying source so that we don't need to re-download as much
# and so that source changes don't invalidate our downloaded layer
RUN go mod download

FROM base as builder

# Copy the go source
COPY k8s-viewer-sv/ k8s-viewer-sv/

# Build
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/k8s-viewer-sv ./k8s-viewer-sv/cmd/main.go

FROM node:18-alpine as ui-builder

# Create build environment
ENV PATH /k8s-viewer-ui/node_modules/.bin:$PATH
RUN mkdir -p k8s-viewer-ui
WORKDIR /work/k8s-viewer-ui
COPY ./k8s-viewer-ui .
RUN yarn install
RUN GENERATE_SOURCEMAP=false yarn build

# Use distroless as minimal base image to package the manager binary
# Refer to https://github.com/GoogleContainerTools/distroless for more details
FROM gcr.io/distroless/static:nonroot
WORKDIR /app
COPY --from=builder /work/bin/k8s-viewer-sv .
COPY --from=ui-builder /work/k8s-viewer-ui/dist ./public

#USER 65532:65532

ENTRYPOINT ["/app/k8s-viewer-sv"]
