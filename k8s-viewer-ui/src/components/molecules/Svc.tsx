import SvcIcon from "../assets/svc.svg";
import OctagonalPillar from "./OctagonalPillar";

const Svc: React.FC = () => {
  return (
    <OctagonalPillar w={30} d={9} color="white">
      <div style={{
        color: '#693cc2',
        margin: 'auto',
        width: '30px',
        background: `url(${SvcIcon}) no-repeat left center`,
        backgroundSize: '30px',
        height: '30px',
        transformStyle: 'preserve-3d',
        transform: 'rotateZ(-90deg)'
      }} />
    </OctagonalPillar>
  );
}

export default Svc;