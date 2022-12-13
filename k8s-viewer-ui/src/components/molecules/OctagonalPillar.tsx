import classes from './OctagonalPillar.module.scss';
import React from 'react';

interface OctagonalPillearProps {
  w?: number; // x
  h?: number; // y
  d?: number; // z
  u?: number; // under margin
  color?: string;
  sideLen?: number;
  style?: {};
  children: React.ReactNode;
}


const OctagonalPillear: React.FC<OctagonalPillearProps> = (props) => {
  const w = (props.w !== undefined) ? props.w : 80;
  const h = (props.h !== undefined) ? props.h : w;
  const d = (props.d !== undefined) ? props.d : 30;
  const u = (props.u !== undefined) ? props.u : 0;
  const sideLen = Math.sqrt(2) * w - w;
  const color = (props.color !== undefined) ? props.color : 'rgb(255,255,255,1)';

  //https://www.it-swarm-ja.tech/ja/reactjs/react%E3%81%A8typescript%E3%81%AE%E3%82%B9%E3%82%BF%E3%82%A4%E3%83%AB%E5%B1%9E%E6%80%A7%E3%81%A7css%E5%A4%89%E6%95%B0%E3%82%92%E5%AE%9A%E7%BE%A9%E3%81%99%E3%82%8B%E6%96%B9%E6%B3%95/805714387/
  return (
    <div
      className={classes.boxBase}
      style={{
        transformStyle: 'preserve-3d',
        ['--bkcolor' as any]: color, ['--w' as any]: `${w}px`, ['--h' as any]: `${h}px`,
        ['--d' as any]: `${d}px`, ['--u' as any]: `${u}px`,
        ['--sideLen' as any]: `${sideLen}px`,
      }}>
      <div className={classes.front} style={{ transformStyle: 'preserve-3d' }}>
        <div
          className={classes.top_side}
          style={{ transform: 'translateZ(var(--d)) rotateZ(0deg)' }} />
        <div
          className={classes.top_side}
          style={{ transform: 'translateZ(var(--d)) rotateZ(90deg)' }} />
        <div
          className={classes.top_side}
          style={{ transform: 'translateZ(var(--d)) rotateZ(45deg)' }} />
        <div
          className={classes.top_side}
          style={{ transform: 'translateZ(var(--d)) rotateZ(-45deg)' }} />
        <div className={classes.top} style={{ transform: `translateZ(${d + 0.1}px)` }} >
          {props.children}
        </div>
      </div>
    </div>
  );
}

export default OctagonalPillear;






