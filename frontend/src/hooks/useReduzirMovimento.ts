import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** true quando o sistema pede menos animação (iOS/Android "Reduzir movimento"). */
export function useReduzirMovimento() {
  const [reduzir, setReduzir] = useState(false);

  useEffect(() => {
    let ativo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => ativo && setReduzir(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduzir);
    return () => {
      ativo = false;
      sub.remove();
    };
  }, []);

  return reduzir;
}
