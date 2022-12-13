package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/spf13/cobra"
	"golang.org/x/net/websocket"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/fields"
	"k8s.io/cli-runtime/pkg/genericclioptions"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/cache"
)

var (
	//configFlags *genericclioptions.ConfigFlags
	clientset *kubernetes.Clientset
)

// --------------------------------------------------------------------------------------------
//
//	Main
//
// --------------------------------------------------------------------------------------------
func main() {
	//home := homeDir()

	// logWriter, err := os.OpenFile(filepath.Join(home, "k8watcher.log"),
	// 	os.O_WRONLY|os.O_CREATE|os.O_APPEND, 0666)
	// if err != nil {
	// 	panic(err.Error())
	// }
	//log.SetOutput(logWriter)
	log.SetFlags(log.Lshortfile | log.Lmicroseconds)
	log.Println("start...")

	configFlags := genericclioptions.NewConfigFlags(false)
	configFlags.AddFlags(rootCmd.PersistentFlags())
	//resourceBuilderFlags := genericclioptions.NewResourceBuilderFlags()
	//resourceBuilderFlags.WithAllNamespaces(false)
	//resourceBuilderFlags.AddFlags(rootCmd.PersistentFlags())

	config, err := configFlags.ToRESTConfig()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	clientset, err = kubernetes.NewForConfig(config)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use: "k8swatcher",
	Run: func(cmd *cobra.Command, args []string) {

		socketServer := NewSocketServer()
		kubeWatcher := NewKubeWatcher(clientset, socketServer)

		go kubeWatcher.Run()
		socketServer.Run()
	},
}

//--------------------------------------------------------------------------------------------
//	Event object
//--------------------------------------------------------------------------------------------

// KubeEvent .
type KubeEvent struct {
	eventType EventType
	newObj    interface{}
}

// NewKubeEvent .
func NewKubeEvent(eventType EventType, newObj interface{}) *KubeEvent {
	return &KubeEvent{
		eventType: eventType,
		newObj:    newObj,
	}
}

// EventType .
type EventType int

const (
	NodeAdd EventType = iota
	NodeUpdate
	NodeDelete
	PodAdd
	PodUpdate
	PodDelete
)

//--------------------------------------------------------------------------------------------
//	Kubenetes resourse definition
//--------------------------------------------------------------------------------------------

type Region struct {
	RegionName        string              `json:"regionName"`
	AvailabilityZones []*AvailabilityZone `json:"availabilityZones"`
	PendingPods       []*Pod              `json:"pendingPods"`
}

type AvailabilityZone struct {
	ZoneName string  `json:"zoneName,omitempty"`
	Nodes    []*Node `json:"nodes,omitempty"`
}

type Node struct {
	Name             string `json:"name,omitempty"`
	Pods             []*Pod `json:"pods"`
	PublicIpAddress  string `json:"publicIpAddress,omitempty"`
	PrivateIpAddress string `json:"privateIpAddress,omitempty"`
	State            string `json:"state,omitempty"`
}

type Pod struct {
	Name      string `json:"name,omitempty"`
	NameSpace string `json:"nameSpace,omitempty"`
	NodeName  string `json:"nodeName,omitempty"`
	App       string `json:"app,omitempty"`
	Image     string `json:"image,omitempty"`
	Phase     string `json:"phase,omitempty"`
}

//--------------------------------------------------------------------------------------------
//	Kubenetes Node/Pod Watcher
//--------------------------------------------------------------------------------------------

// KubeWatcher .
type KubeWatcher struct {
	Sender    chan<- *KubeEvent
	clientset *kubernetes.Clientset

	Receiver     <-chan *KubeEvent
	Nodes        []*v1.Node
	Pods         []*v1.Pod
	lastSendData string
	socketServer *SocketServer
}

// NewKubeWatcher .
func NewKubeWatcher(clientset *kubernetes.Clientset, socketServer *SocketServer) *KubeWatcher {

	eventChan := make(chan *KubeEvent, 20)
	return &KubeWatcher{
		Sender:    eventChan,
		clientset: clientset,

		Receiver:     eventChan,
		Nodes:        []*v1.Node{},
		Pods:         []*v1.Pod{},
		lastSendData: "",
		socketServer: socketServer,
	}
}

// Run .
func (kw *KubeWatcher) Run() {

	//
	//   EventReciever <----------- EventSender
	//                   kubeEvent

	go kw.EventReciever()
	go kw.EventSender()
}

// EventSender
func (kw *KubeWatcher) EventSender() {
	log.Println("KubeWatcher Run start")
	watchNodes := cache.NewListWatchFromClient(
		kw.clientset.CoreV1().RESTClient(), "nodes", v1.NamespaceAll, fields.Everything())

	_, nodesController := cache.NewInformer(
		watchNodes, &v1.Node{}, 0,
		cache.ResourceEventHandlerFuncs{
			AddFunc:    func(obj interface{}) { kw.Sender <- NewKubeEvent(NodeAdd, obj) },
			DeleteFunc: func(obj interface{}) { kw.Sender <- NewKubeEvent(NodeDelete, obj) },
			UpdateFunc: func(old, new interface{}) { kw.Sender <- NewKubeEvent(NodeUpdate, new) },
		},
	)
	watchPods := cache.NewListWatchFromClient(
		kw.clientset.CoreV1().RESTClient(), string(v1.ResourcePods), v1.NamespaceAll, fields.Everything())

	_, podsController := cache.NewInformer(
		watchPods, &v1.Pod{}, 0,
		cache.ResourceEventHandlerFuncs{
			AddFunc:    func(obj interface{}) { kw.Sender <- NewKubeEvent(PodAdd, obj) },
			DeleteFunc: func(obj interface{}) { kw.Sender <- NewKubeEvent(PodDelete, obj) },
			UpdateFunc: func(old, new interface{}) { kw.Sender <- NewKubeEvent(PodUpdate, new) },
		},
	)

	stop := make(chan struct{})
	defer close(stop)
	go nodesController.Run(stop)
	go podsController.Run(stop)
	log.Println("KubeWatcher Controllers started")

	for {
		time.Sleep(time.Second)
	}
}

// EventReciever .
func (kw *KubeWatcher) EventReciever() {
	for {
		kubeEvent := <-kw.Receiver

		log.Println(kubeEvent.eventType)
		switch kubeEvent.eventType {
		case NodeAdd:
			kw.Nodes = append(kw.Nodes, kubeEvent.newObj.(*v1.Node))
		case NodeUpdate:
			forEachObject(kw.Nodes, kubeEvent.newObj.(*v1.Node), func(index int) {
				kw.Nodes[index] = kubeEvent.newObj.(*v1.Node)
			})
		case NodeDelete:
			forEachObject(kw.Nodes, kubeEvent.newObj.(*v1.Node), func(index int) {
				kw.Nodes = append(kw.Nodes[:index], kw.Nodes[index+1:]...)
			})
		case PodAdd:
			kw.Pods = append(kw.Pods, kubeEvent.newObj.(*v1.Pod))
		case PodUpdate:
			forEachObject(kw.Pods, kubeEvent.newObj.(*v1.Pod), func(index int) {
				kw.Pods[index] = kubeEvent.newObj.(*v1.Pod)
			})
		case PodDelete:
			forEachObject(kw.Pods, kubeEvent.newObj.(*v1.Pod), func(index int) {
				kw.Pods = append(kw.Pods[:index], kw.Pods[index+1:]...)
			})
		}

		region := &Region{
			RegionName:        "default-region",
			AvailabilityZones: []*AvailabilityZone{},
			PendingPods:       []*Pod{},
		}

		azMap := map[string]*AvailabilityZone{}
		nodeMap := map[string]*Node{}

		for _, n := range kw.Nodes {
			//zone
			zone, ok := n.GetLabels()["failure-domain.beta.kubernetes.io/zone"]
			zoneName := zone
			if !ok {
				zoneName = "default-zone"
			}
			var az *AvailabilityZone
			if az, ok = azMap[zone]; !ok {
				az = &AvailabilityZone{
					ZoneName: zoneName,
					Nodes:    []*Node{},
				}
				azMap[zone] = az
				region.AvailabilityZones = append(region.AvailabilityZones, az)
				sort.SliceStable(region.AvailabilityZones, func(i, j int) bool {
					return region.AvailabilityZones[i].ZoneName < region.AvailabilityZones[j].ZoneName
				})
			}

			//node
			node := &Node{
				Name:  n.GetName(),
				Pods:  []*Pod{},
				State: nodeStats(n),
			}
			nodeMap[n.GetName()] = node
			az.Nodes = append(az.Nodes, node)
			sort.SliceStable(az.Nodes, func(i, j int) bool {
				return az.Nodes[i].Name < az.Nodes[j].Name
			})
		}

		reg := regexp.MustCompile(`(\S+)-[^-]+-$`)
		// pod
		for _, p := range kw.Pods {
			pod := &Pod{
				Name:      p.GetName(),
				NameSpace: p.GetNamespace(),
				NodeName:  p.Spec.NodeName,
				App:       reg.FindAllStringSubmatch(p.GetGenerateName(), -1)[0][1],
				Phase:     podStats(p),
			}
			if node, ok := nodeMap[p.Spec.NodeName]; ok {
				node.Pods = append(node.Pods, pod)
				sort.SliceStable(node.Pods, func(i, j int) bool {
					return node.Pods[i].Name < node.Pods[j].Name
				})
			} else {
				region.PendingPods = append(region.PendingPods, pod)
				sort.SliceStable(region.PendingPods, func(i, j int) bool {
					return region.PendingPods[i].Name < region.PendingPods[j].Name
				})
			}
		}

		jsonData, err := json.Marshal(region)
		if err != nil {
			log.Println(err)
			return
		}
		out := new(bytes.Buffer)
		json.Indent(out, jsonData, "", "  ")
		log.Println(out.String())

		kw.lastSendData = string(jsonData)

		data := string(jsonData)
		data = strings.TrimLeft(data, "{")
		data = strings.TrimRight(data, "}")
		kw.socketServer.Broad(fmt.Sprintf(`{
			"message": "sendmessage",
			"type" :"eks",
			%s
		  }`, data))
	}
}

func forEachObject[T metav1.Object](objects []T, obj T, fn func(index int)) {
	for i, o := range objects {
		if o.GetName() == obj.GetName() {
			fn(i)
			break
		}
	}
}

// nodeStats .
// 参考）
// https://github.com/kubernetes/kubernetes/blob/master/pkg/printers/internalversion/printers.go#printNode
func nodeStats(obj *v1.Node) string {
	conditionMap := make(map[v1.NodeConditionType]*v1.NodeCondition)
	NodeAllConditions := []v1.NodeConditionType{v1.NodeReady}
	for i := range obj.Status.Conditions {
		cond := obj.Status.Conditions[i]
		conditionMap[cond.Type] = &cond
	}
	var status []string
	for _, validCondition := range NodeAllConditions {
		if condition, ok := conditionMap[validCondition]; ok {
			if condition.Status == v1.ConditionTrue {
				status = append(status, string(condition.Type))
			} else {
				status = append(status, "Not"+string(condition.Type))
			}
		}
	}
	if len(status) == 0 {
		status = append(status, "Unknown")
	}
	if obj.Spec.Unschedulable {
		status = append(status, "SchedulingDisabled")
	}
	return strings.Join(status, ",")
}

// podStats .
// 参考）
// https://github.com/kubernetes/kubernetes/blob/master/pkg/printers/internalversion/printers.go#printPod
func podStats(pod *v1.Pod) string {
	reason := string(pod.Status.Phase)
	if pod.Status.Reason != "" {
		reason = pod.Status.Reason
	}

	initializing := false
	for i := range pod.Status.InitContainerStatuses {
		container := pod.Status.InitContainerStatuses[i]
		switch {
		case container.State.Terminated != nil && container.State.Terminated.ExitCode == 0:
			continue
		case container.State.Terminated != nil:
			if len(container.State.Terminated.Reason) == 0 {
				if container.State.Terminated.Signal != 0 {
					reason = fmt.Sprintf("Init:Signal:%d", container.State.Terminated.Signal)
				} else {
					reason = fmt.Sprintf("Init:ExitCode:%d", container.State.Terminated.ExitCode)
				}
			} else {
				reason = "Init:" + container.State.Terminated.Reason
			}
			initializing = true
		case container.State.Waiting != nil && len(container.State.Waiting.Reason) > 0 && container.State.Waiting.Reason != "PodInitializing":
			reason = "Init:" + container.State.Waiting.Reason
			initializing = true
		default:
			reason = fmt.Sprintf("Init:%d/%d", i, len(pod.Spec.InitContainers))
			initializing = true
		}
		break
	}
	if !initializing {
		hasRunning := false
		for i := len(pod.Status.ContainerStatuses) - 1; i >= 0; i-- {
			container := pod.Status.ContainerStatuses[i]
			if container.State.Waiting != nil && container.State.Waiting.Reason != "" {
				reason = container.State.Waiting.Reason
			} else if container.State.Terminated != nil && container.State.Terminated.Reason != "" {
				reason = container.State.Terminated.Reason
			} else if container.State.Terminated != nil && container.State.Terminated.Reason == "" {
				if container.State.Terminated.Signal != 0 {
					reason = fmt.Sprintf("Signal:%d", container.State.Terminated.Signal)
				} else {
					reason = fmt.Sprintf("ExitCode:%d", container.State.Terminated.ExitCode)
				}
			} else if container.Ready && container.State.Running != nil {
				hasRunning = true
			}
		}

		if reason == "Completed" && hasRunning {
			reason = "Running"
		}
	}

	// if pod.DeletionTimestamp != nil && pod.Status.Reason == node.NodeUnreachablePodReason {
	// 	reason = "Unknown"
	// } else
	if pod.DeletionTimestamp != nil {
		reason = "Terminating"
	}
	return reason
}

//--------------------------------------------------------------------------------------------
//  Websocket
//--------------------------------------------------------------------------------------------

type SocketServer struct {
	clients map[*websocket.Conn]bool
	mu      sync.RWMutex

	lastBroadMsg string
}

func NewSocketServer() *SocketServer {
	return &SocketServer{
		clients: make(map[*websocket.Conn]bool),
	}
}

func (sock *SocketServer) lock(fn func()) {
	sock.mu.Lock()
	defer sock.mu.Unlock()
	fn()
}

func (sock *SocketServer) Run() {
	mux := http.NewServeMux()
	mux.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir("/app/public"))))
	mux.Handle("/ws", websocket.Handler(sock.msgHandler))

	err := http.ListenAndServe(":6000", mux)
	if err != nil {
		log.Fatal(err)
	}
}

func (sock *SocketServer) msgHandler(ws *websocket.Conn) {
	log.Println("msgHandler start", ws.LocalAddr(), ws.Request().Header)
	defer ws.Close()
	sock.lock(func() { sock.clients[ws] = true })

	err := websocket.Message.Send(ws, sock.lastBroadMsg)
	if err != nil {
		log.Fatalln(err)
	}

	ping := `{
		"message": "sendmessage",
		"action": "regist publisher",
		"name": "eks-watcher"
	  }`

	for {

		time.Sleep(time.Second * 30)
		err = websocket.Message.Send(ws, ping)
		if err != nil {
			log.Println("close", err)
			break
		}
		// err = websocket.Message.Receive(ws, &msg)
		// if err != nil {
		// 	log.Println("close", err)
		// 	break
		// }
	}
	sock.lock(func() { sock.clients[ws] = true })
	log.Println("msgHandler end")
}

func (sock *SocketServer) Broad(msg string) {
	log.Println("broad start")

	sock.lastBroadMsg = msg

	clients := make([]*websocket.Conn, 0, len(sock.clients))
	sock.lock(func() {
		for cl := range sock.clients {
			clients = append(clients, cl)
		}
	})
	log.Println(len(clients))
	for _, cl := range clients {
		if err := websocket.Message.Send(cl, msg); err != nil {
			log.Println("send error", err)
		}
	}

	log.Println("broad end")
}

// --------------------------------------------------------------------------------------------
//
//	Utilities
//
// --------------------------------------------------------------------------------------------
func jsonDump(a ...interface{}) {
	jsonBytes, err := json.Marshal(a)
	if err != nil {
		panic(err.Error())
	}
	out := new(bytes.Buffer)
	json.Indent(out, jsonBytes, "", "    ")
	fmt.Println(out.String())
}

// homeDir .
func homeDir() string {
	if h := os.Getenv("HOME"); h != "" {
		return h
	}
	return os.Getenv("USERPROFILE") // windows
}
