import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function Latex({ children = "", className }) {
    if (Array.isArray(children))
        throw new Error("Cannot render multiple tex strings");
    const elemRef = useRef(null);
    useEffect(() => {
        if (!elemRef.current) return;
        katex.render(children, elemRef.current, {});
    }, [children]);
    return <span className={className} ref={elemRef}></span>;
}
