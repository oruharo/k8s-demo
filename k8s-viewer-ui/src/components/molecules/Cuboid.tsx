import { Theme } from '@mui/material';
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import React from 'react';

interface CuboidProps {
  w: number; // x
  h: number; // y
  d: number; // z
  u?: number; // under margin
  color?: string;
  style?: {};
  bottom?: any;
  top?: any;
  left?: any;
  right?: any;
  front?: any;
  back?: any;
}

const useStyles = makeStyles<Theme, CuboidProps>(() => {
  //https://stackoverflow.com/questions/48879517/passing-props-to-material-ui-style#54834201

  const w = (props: CuboidProps) => props.w;
  const h = (props: CuboidProps) => props.h;
  const d = (props: CuboidProps) => props.d;
  const u = (props: CuboidProps) => (props.u !== undefined) ? props.u : 0;
  return createStyles({
    boxBase: {
      transformStyle: 'preserve-3d',
      position: 'relative',
      width: w,
      height: h,
      '& >div': {
        position: 'absolute',
        backgroundColor: (p) => (p.color !== undefined) ? p.color : 'rgb(255,255,255,0.5)',
        border: '1px solid #555555',
        boxSizing: 'border-box',
        textAlign: 'center',
      },
    },

    bottom: {
      width: w,
      height: d,
      bottom: p => d(p) / -2,
      transform: p => `translateZ(${d(p) / 2 + u(p)}px) rotateX(-90deg)`,
    },
    top: {
      width: w,
      height: d,
      top: p => d(p) / -2,
      transform: p => `translateZ(${d(p) / 2 + u(p)}px) rotateX(-90deg) rotateY(180deg)`,
    },

    left: {
      width: h,
      height: d,
      top: p => d(p) / -2,
      left: p => h(p) / -2,
      transform: p => `translateY(${h(p) / 2}px) translateZ(${d(p) / 2 + u(p)}px) rotateX(-90deg) rotateY(-90deg)`,
    },
    right: {
      width: h,
      height: d,
      top: p => d(p) / -2,
      right: p => h(p) / -2,
      transform: p => `translateY(${h(p) / 2}px) translateZ(${d(p) / 2 + u(p)}px) rotateX(-90deg) rotateY(90deg)`,
    },
    back: {
      width: w,
      height: h,
      transform: p => `translateZ(${u(p)}px) rotateX(180deg)`,
    },
    front: {
      width: w,
      height: h,
      transform: p => `translateZ(${d(p) + u(p)}px)`,
    },
  });
});


const Cuboid: React.FC<CuboidProps> = (props) => {

  const classes = useStyles(props);

  return (
    <>
      {/* style="--bkcolor:{color}; --w:{w}px; --h:{h}px; --d:{d}px; --u:{u}px; {style};"> */}
      <div className={classes.boxBase}>
        <div className={classes.bottom}>
          {props.bottom}
        </div>
        <div className={classes.top}>
          {props.top}
        </div>
        <div className={classes.left}>
          {props.left}
        </div>
        <div className={classes.right}>
          {props.right}
        </div>
        <div className={classes.back}>
          {props.back}
        </div>
        <div className={classes.front}>
          {props.front}
        </div>
      </div>
    </>
  );
}

export default Cuboid;