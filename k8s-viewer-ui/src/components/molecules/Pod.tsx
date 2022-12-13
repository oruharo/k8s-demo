
import { GetColor } from "./PodStore";
import Cuboid from "./Cuboid";
import classes from './Pod.module.scss';
import { IPod } from "../entities/EksEntity.js";

interface PodProps {
  w: number; // x
  h: number; // y
  d: number; // z
  u?: number; // under margin
  style?: {};
  pod: IPod;
}

export let style = "";

//let color:string; = getColor(pod);

const Pod: React.FC<PodProps> = (props) => {
  const color = GetColor(props.pod); //'rgb(0,167,219)';

  return (
    <Cuboid w={props.w} h={props.h} d={props.d} u={props.u} color={color} style={props.style}
      bottom={
        <div className={classes.pod_sideface}>
          <span style={{ transform: 'scaleX(2)', backgroundColor: 'white', fontSize: `${16 * props.w / 120}}px` }}>
            {(props.pod.app !== '' ? props.pod.app : props.pod.name).substr(0, 7)}
          </span>
        </div>
      }
      front={
        <div className={classes.pod_sideface}>
          <span style={{ color: '#eee', backgroundColor: 'rgba(255,255,255,0)', fontSize: `${16 * props.w / 120}px` }}>
            {(props.pod.app !== '' ? props.pod.app : props.pod.name)}
          </span>
        </div>
      }
      left={
        <div className={classes.pod_sideface} />
      }
    />
  );
}

export default Pod;