import { useRef } from "react";
import { IPod } from "../entities/EksEntity";

const colors = [
    ["rgb(0,167,219)", "rgba(0,167,219,  0.2)"], // 東西線スカイ　#00a7db
    ["rgb(230,0,18)", "rgba(230,0,18,   0.2)"], // 丸の内線レッド　#e60012
    ["rgb(156,174,183)", "rgba(156,174,183,0.2)"], // 日比谷線シルバー　#9caeb7
    ["rgb(0,153,68)", "rgba(0,153,68,   0.2)"], // 千代田線グリーン #009944
    ["rgb(215,196,71)", "rgba(215,196,71, 0.2)"], // 有楽町線ゴールド #d7c447
    ["rgb(155,124,182)", "rgba(155,124,182,0.2)"], // 半蔵門線パープル #9b7cb6
    ["rgb(0,173,169)", "rgba(0,173,169,  0.2)"], // 南北線エメラルド #00ada9
    ["rgb(187,100,29)", "rgba(187,100,29, 0.2)"], // 副都心線ブラウン #bb641d
    ["rgb(232,82,152)", "rgba(232,82,152, 0.2)"], // 浅草線ローズ #e85298
    ["rgb(0,121,194)", "rgba(0,121,194,  0.2)"], // 三田線ブルー #0079c2
    ["rgb(108,187,90)", "rgba(108,187,90, 0.2)"], // 新宿線リーフ #6cbb5a
    ["rgb(182,0,122)", "rgba(182,0,122,  0.2)"], // 大江戸線ルビー #b6007a
    ["rgb(243,151,0)", "rgba(243,151,0,  0.2)"], // 銀座線オレンジ　#f39700
];
export const Xxxx = () => {
    const podColor = useRef({});

    return podColor.current;
}

let podColors = {};

export const GetColor = (pod: IPod) => {

    const podName = pod.name.replace(/-[^-]+$/, "");
    // const ap = (pod.app !== '' ? pod.app : podName) + pod.image.split(":")[1];
    const ap = (pod.app !== '' ? pod.app : podName);
    let col = ["", ""];

    if (ap in podColors) {
        col = podColors[ap as keyof {}];
    } else {
        let len = Object.keys(podColors).length;
        col = colors[len % colors.length];
        podColors = {
            ...podColors,
            [ap]: col
        };
    }
    return col[pod.phase === 'Running' ? 0 : 1];
}