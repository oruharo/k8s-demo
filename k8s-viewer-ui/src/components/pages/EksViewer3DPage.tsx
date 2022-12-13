import React, { useEffect, useRef, useState } from "react";
import kubernetesIcon from '../assets/kubernetes.svg';
import mobyIcon from '../assets/Moby-logo.png';
import userIcon from '../assets/User_light-bg.svg';
import { demoData, IRegion } from "../entities/EksEntity";
import Alb from "../molecules/Alb";
import Cuboid from "../molecules/Cuboid";
import Pod from "../molecules/Pod";
import Svc from "../molecules/Svc";
import classes from './EksViewer3DPage.module.scss';

const EksViewer3DPage: React.FC = () => {

  const albElm = useRef(null);
  const xRayBaseElm = useRef(null);
  let xrays: any[] = [];
  const [region, setRegion] = useState(demoData)
  const [healthCheckShow, setHealthCheckShow] = useState(true);
  const [systemPodShow, setSystemPodShow] = useState(false);

  const [wss, setWss] = useState(Date.now());
  let ws = useRef(WebSocket.prototype);
  useEffect(() => {
    let wsUrl = `wss://${window.location.host}${import.meta.env.BASE_URL}ws`
    console.log(wsUrl)
    ws.current = new WebSocket(wsUrl);
    ws.current.onopen = () => {
      console.log("ws opened");
      ws.current.send(JSON.stringify({
        message: "sendmessage",
        action: "regist subscriber",
        name: "eks-viewer",
        subscribe: "eks-watcher",
      }));
    };
    ws.current.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.type === "healthcheck") {
        //healthCheck(msg);
      } else if (msg.type === "ap") {
        console.log(msg);
        //routeConnect(msg);
      } else if (msg.type === "eks") {
        console.log("eks", msg);
        setRegion(msg as IRegion);
      } else {
        console.log(msg);
      }
    };
    ws.current.onclose = () => {
      console.log("ws closed");
      setWss(Date.now());
    }
    return () => {
      ws.current.close();
    };
  }, [wss]);

  //------------------------------------------------------
  // 3D Rotate
  //------------------------------------------------------
  const sceneBaseElm = useRef<HTMLDivElement>(null);
  const sceneElm = useRef<HTMLDivElement>(null);
  useEffect(() => {
    //rotate3D()
    let angleX = 45;
    let angleZ = -45;
    let moving = false;
    console.log('rotate3D', 1);
    if (sceneBaseElm.current === null) return;
    sceneBaseElm.current.addEventListener("mousedown", () => (moving = true));
    window.addEventListener("mouseup", () => (moving = false));
    sceneBaseElm.current.addEventListener("mousemove", (e: MouseEvent) => {
      if (moving) {
        angleZ -= (Math.asin((e.movementX / 400) % 1) / Math.PI) * 180;
        angleX -= (Math.asin((e.movementY / 400) % 1) / Math.PI) * 180;
        if (sceneElm.current !== null) {
          sceneElm.current.style.transform = `rotateX(${angleX}deg) rotateZ(${angleZ}deg) scale(0.75)`;
        }
      }
    });
  }, [sceneElm]);

  return (
    <React.Fragment>
      <div className={classes.header}>kubernetes Demo</div>
      <div id="toprect" className={classes.toprect}>
        <div className={classes['scene-base']} ref={sceneBaseElm}>
          <div className={classes['scene']} ref={sceneElm}>
            {/* AWS Region */}
            <div className={classes['region']}>
              <h1 className={classes['title']}>{region.regionName}</h1>
              {/* EKS */}
              <div className={classes['eks']}>
                {/* pendding */}
                <div className={classes['pendding']}>
                  <Cuboid w={80} h={80} d={20} color="white" bottom={'pending'} />
                  <div style={{ position: 'absolute', top: 0, width: '80px', height: '80px', transformStyle: 'preserve-3d', transform: 'translateZ(20px)' }}>
                    {region.pendingPods && region.pendingPods.filter(p => (systemPodShow ? true : p.nameSpace !== 'kube-system'))
                      .map((pod, podcount) => (
                        <div key={pod.name} style={{ transformStyle: 'preserve-3d' }}>
                          {/* in:podAdd out:podDelete  */}
                          <Pod pod={pod} w={80} h={18} d={30} u={Math.floor(podcount / 4) * 32}
                            style={{ position: 'absolute', left: '0px', top: `${((podcount + 2) % 4) * 20}px` }} />
                        </div>
                      ))
                    }
                  </div>
                </div>
                {/* Auto Scaling group */}
                <h1
                  style={{
                    fontFamily: 'Ubuntu, sans-serif', color: '#2F6EE1', //color: '#e27a21',
                    position: 'absolute',
                    margin: 0, left: '0px', right: '0px', bottom: '0px',
                    fontSize: '20px', lineHeight: '30px', textAlign: 'left', paddingLeft: '37px',
                    background: `url(${kubernetesIcon})  no-repeat`, backgroundSize: '30px'
                  }}>
                  kubernetes cluster
                </h1>
                {/* EKS title */}
                {/* <div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0, left: 0, margin: 0, height: '30px', paddingLeft: '37px',
                      color: '#e27a21', fontSize: '20px',
                      background: `url(${eksIcon}) no-repeat`, backgroundSize: '30px'
                    }}>
                    Amazon Elastic Kubernetes Service
                  </div>
                </div> */}
              </div>
              {/* alb */}
              <div className={classes.alb}>
                <div>
                  <div style={{ height: '50px' }} />
                  <div ref={albElm}>
                    <Alb />
                  </div>
                </div>
              </div>
              {/* AZ */}
              <div className={classes['az-base']}>
                {region.availabilityZones.map((az, i) => {
                  return (
                    <div key={az.zoneName} className={classes['availability-zone']}
                      style={{ margin: '20px 10px 20px 0', height: '200px', backgroundColor: 'rgba(6,146,194,0.2)' }}>
                      <h1 className={classes['title']}>{az.zoneName}</h1>
                      <div style={{ gridArea: 'node-base', display: 'flex', justifyContent: 'center', margin: '20px 30px 0px 97px' }}>
                        {az.nodes.filter(node => (node.state !== 'terminated')).map((node, j) => (
                          <div key={node.name} style={{ position: 'relative', width: '160px', height: '161px', marginRight: '49px' }}>
                            <div style={{ position: 'absolute', width: '160px', height: '161px' }}>
                              <Cuboid w={160} h={168} d={40} u={0} color="#fff" style={{ position: 'absolute', top: 0 }}
                                left={
                                  <div>
                                    <div style={{ background: `url(${mobyIcon}) no-repeat`, backgroundSize: '25px', width: '100%', height: '20px' }}>
                                      Docker
                                    </div>
                                    <div style={{ width: '100%', height: '20px' }}>
                                      {node.name}
                                    </div>
                                  </div>
                                }
                              />
                              <div style={{ position: 'absolute', top: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
                                <div id={node.privateIpAddress}
                                  style={{ height: '30px', transformStyle: 'preserve-3d', transform: 'translateZ(40px)' }}>
                                  <Svc />
                                </div>
                              </div>
                            </div>
                            {node.pods.filter(p => (systemPodShow ? true : p.nameSpace !== 'kube-system'))
                              .map((podx, podcount) => (
                                <div key={podx.name} id={podx.name}
                                  style={{
                                    transformStyle: 'preserve-3d',
                                    transform: `translateZ(${40 + Math.floor(podcount / 4) * 45}px)`,
                                    position: 'absolute',
                                    left: '40px', top: `${4 + (podcount % 4) * (8 + 34)}px`
                                  }}>
                                  {/* in:podAdd out:podDelete */}
                                  <Pod pod={podx} w={120} h={34} d={40} />
                                </div>
                              ))
                            }
                          </div>
                        ))
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Request route */}
              <div className={classes['x-rays-base']} ref={xRayBaseElm}
                style={{ position: 'absolute', left: '-100px', top: 0, right: 0, bottom: 0, border: '4px solid #eee' }}>
                {xrays.map((xray) => (
                  <div key={xray.msg} id="x-ray-base" >
                    {/* User */}
                    <div
                      style={{
                        position: 'absolute', top: `${xray.xray1_top}px`, width: '50px', height: '70px',
                        background: `url(${userIcon}) no-repeat center top`,
                        backgroundSize: '50px',
                        transform: 'translate3d(-25px,-35px,35px) rotateX(-90deg)',
                      }}>
                      <div style={{ position: 'absolute', bottom: 0, backgroundColor: 'khaki' }}>{xray.clientIp}</div>
                    </div>
                    {/* from User to Node-SVC */}
                    <svg className={classes['x-ray1']}>
                      <g stroke-linecap="round" fill="none" stroke-opacity="0.9">
                        <path d={xray.xray1} stroke-width="9" stroke="#fff" />
                        <path d={xray.xray1} stroke-width="7" stroke={xray.color} />
                      </g>
                      <g fill-opacity="1">
                        <circle r="9" cx={xray.alb.x} cy={xray.alb.y} fill="#fff" />
                        <circle r="7" cx={xray.alb.x} cy={xray.alb.y} fill={xray.color} />
                        <circle r="9" cx={xray.svc.x} cy={xray.svc.y} fill="#fff" />
                        <circle r="7" cx={xray.svc.x} cy={xray.svc.y} fill={xray.color} />
                      </g>
                    </svg>
                    {/* from SVC to Pod */}
                    <svg
                      style={{
                        position: 'absolute', top: `${xray.svc.y}px`, left: `${xray.svc.x}px`, width: '300px',
                        height: '600px', transformStyle: 'preserve-3d',
                        transformOrigin: '0 0',
                        transform: `rotateY(-90deg) rotateX(${-Math.PI / 2 + xray.xray4_zrad}rad)`
                      }}>
                      <g stroke-linecap="round" fill="none" stroke-opacity="0.9">
                        <path d={xray.xray4} stroke-width="9" stroke="#fff" />
                        <path d={xray.xray4} stroke-width="7" stroke={xray.color} />
                      </g>
                    </svg>
                    <svg className={classes['x-ray2']} style={{ left: `${xray.pod.x - 1}px` }}>
                      <g fill-opacity="1">
                        <circle r="9" cx={xray.pod.z + 14} cy={xray.pod.y} fill="#fff" />
                        <circle r="7" cx={xray.pod.z + 14} cy={xray.pod.y} fill={xray.color} />
                      </g>
                    </svg>
                  </div>
                ))
                }
              </div>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '3px', right: '3px', padding: '5px 5px 0 5px', border: '2px dotted #0692c5' }}>
            <input id="chk_systemPodShow" type="checkbox" checked={systemPodShow}
              onChange={e => { setSystemPodShow(e.target.checked); }} />
            <label htmlFor="chk_systemPodShow">show system pods</label>
            <input id="chk_healthcheck" type="checkbox" checked={healthCheckShow}
              onChange={e => { setHealthCheckShow(e.target.checked); }} />
            <label htmlFor="chk_healthcheck">show heart beat</label>
          </div>
        </div>
        <div style={{ marginLeft: '50px', width: '600px', height: '600px' }}>
          {/* <iframe id="gotty" title="console" src="http://localhost:8080/" style="width:600px,height:600px">loading..</iframe>
        <div>
          <button on:click={() => testSend(1)}>send</button>
          <button on:click={() => testSend(10)}>send ×10</button>
          <input id="chk_testSendSequential" type="checkbox" bind:checked={sendSeq} on:change={testSendSequential} />
          <label for="chk_testSendSequential">send sequential</label>
        </div> */}
        </div>
      </div >
    </React.Fragment >
  );
};

export default EksViewer3DPage;
