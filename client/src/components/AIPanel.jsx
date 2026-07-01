import React, { useState, useEffect } from "react";
import { BrainCircuit } from "lucide-react";

export function AIPanel({ title = "SMIMP AI", children, status = "active", action }) {
  const [typedText, setTypedText] = useState("");
  const contentStr = typeof children === "string" ? children : "";

  // Typing effect animation for string children
  useEffect(() => {
    if (typeof children !== "string") return;
    
    let index = 0;
    setTypedText("");
    
    const timerId = setInterval(() => {
      if (index < children.length) {
        const char = children.charAt(index);
        setTypedText((prev) => prev + char);
        index++;
      } else {
        clearInterval(timerId);
      }
    }, 20);
    
    return () => clearInterval(timerId);
  }, [children]);

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <div className={`ai-icon ${status === "analyzing" ? "analyzing" : ""}`} style={{ color: "var(--color-brand)" }}>
          <BrainCircuit size={16} strokeWidth={1.5} className={status === "analyzing" ? "pulse-glow" : ""} />
        </div>
        <div className="ai-title">{title}</div>
        {status === "analyzing" && <div className="badge" style={{ marginLeft: "auto" }}>Analyzing...</div>}
        {action && <div style={{ marginLeft: "auto" }}>{action}</div>}
      </div>
      <div className={`ai-content ${typeof children === "string" && typedText.length < children.length ? "ai-typing" : ""}`}>
        {typeof children === "string" ? typedText : children}
      </div>
    </div>
  );
}
