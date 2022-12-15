export interface IRegion {
  regionName: string;
  availabilityZones: {
    zoneName: string;
    nodes: INode[];
  }[];
  pendingPods: IPod[];
}

export interface INode {
  name: string;
  pods: IPod[];
  publicIpAddress: string;
  privateIpAddress: string;
  state: string;
}

export interface IPod {
  name: string;
  nameSpace: string;
  app: string;
  image: string;
  phase: string;
}

const pod1: IPod = { name: "111", nameSpace: "yyy", app: "zzz1", image: "image1", phase: "" }
const pod2: IPod = { name: "222", nameSpace: "yyy", app: "zzz2", image: "image2", phase: "" }
const pod3: IPod = { name: "333", nameSpace: "yyy", app: "zzz3", image: "image3", phase: "" }
const pod4: IPod = { name: "444", nameSpace: "yyy", app: "zzz4", image: "image4", phase: "" }
const pod5: IPod = { name: "555", nameSpace: "yyy", app: "zzz5", image: "image5", phase: "" }
const pod6: IPod = { name: "666", nameSpace: "yyy", app: "zzz6", image: "image1", phase: "" }
const pod7: IPod = { name: "777", nameSpace: "yyy", app: "zzz7", image: "image2", phase: "" }
const pod8: IPod = { name: "888", nameSpace: "yyy", app: "zzz8", image: "image3", phase: "" }
const pod9: IPod = { name: "999", nameSpace: "yyy", app: "zzz9", image: "image4", phase: "" }
const pod10: IPod = { name: "aaa", nameSpace: "yyy", app: "zzzA", image: "image5", phase: "" }
const node1: INode = { name: "node1", pods: [pod1, pod2], publicIpAddress: "", privateIpAddress: "", state: "" };
const node2: INode = { name: "node2", pods: [pod1, pod2], publicIpAddress: "", privateIpAddress: "", state: "" };
const node3: INode = { name: "node3", pods: [pod1, pod2], publicIpAddress: "", privateIpAddress: "", state: "" };

export const demoData: IRegion = {
  regionName: "xxxxx",
  availabilityZones: [
    { zoneName: "aaa", nodes: [node1] },
    { zoneName: "bbb", nodes: [node1, node2] },
    { zoneName: "ccc", nodes: [node1, node2, node3] }
  ],
  pendingPods: [pod1, pod2, pod3, pod4, pod5, pod6, pod7, pod8, pod9, pod10]
};