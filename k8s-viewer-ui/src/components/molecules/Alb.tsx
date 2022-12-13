import React from 'react';
import classes from './Alb.module.scss';
import OctagonalPillar from "./OctagonalPillar";

const Alb: React.FC = () => {
  return (
    <OctagonalPillar w={60} d={49} color="white">
      <div className={classes.alb} />
    </OctagonalPillar>
  );
}

export default Alb;