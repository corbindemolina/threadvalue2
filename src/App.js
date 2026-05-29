import { useState, useRef, useCallback } from "react";

const PLANS = [
  { id: "free", name: "Free", credits: 3, price: 0, label: "Get started" },
  { id: "starter", name: "Starter", credits: 25, price: 14.99, label: "Most popular", highlight: true },
  { id: "pro", name: "Pro", credits: 50, price: 25.99, label: "Best value" },
];

export default function ThreadValue() {
  const [credits, setCredits] = useState(3);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef();

  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageBase64(e.target.result.split(",")[1]);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, []);

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    if (credits <= 0) { setShowPaywall(true); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:3001/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },  
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }
              },
              {
                type: "text",
                text: `You are a luxury fashion resale expert. Analyze this clothing item and return ONLY valid JSON with no markdown, no backticks, no preamble. Return exactly this structure:
{
  "item": "item name/type",
  "brand": "brand name or 'Unknown'",
  "condition": "Poor | Fair | Good | Excellent",
  "conditionScore": 1-10,
  "valueLow": number in USD,
  "valueMid": number in USD,
  "valueHigh": number in USD,
  "bestPlatforms": ["platform1", "platform2", "platform3"],
  "explanation": "2-3 sentence expert explanation of the valuation",
  "style": "brief style description",
  "sellTip": "one actionable tip to maximize resale value"
}`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map(b => b.text || "").join("");
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      setResult(parsed);
      setCredits(c => c - 1);
      setHistory(h => [{ image, result: parsed }, ...h].slice(0, 8));
    } catch (err) {
      setError("Could not analyze this image. Please try a clearer photo of your clothing item.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (plan) => {
    setCredits(c => c + plan.credits);
    setShowPaywall(false);
  };

  const conditionColor = (c) => {
    const map = { Poor: "#e57373", Fair: "#ffb74d", Good: "#81c784", Excellent: "#4db6ac" };
    return map[c] || "#ccc";
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: "#0f0e0c", color: "#f5f0e8" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: "0.5px solid #2a2620", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#0f0e0c", zIndex: 10 }}>
        <div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#c9a84c", letterSpacing: "-0.5px" }}>ThreadValue</span>
          <span style={{ marginLeft: 8, fontSize: 13, color: "#7a7060" }}>✦ Know what your clothes are worth</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {credits <= 1 && credits > 0 && (
            <span style={{ fontSize: 12, color: "#c9a84c", background: "#1e1a0e", border: "0.5px solid #c9a84c", padding: "4px 10px", borderRadius: 20 }}>
              Last free credit!
            </span>
          )}
          <div style={{ background: "#1a1710", border: "0.5px solid #2a2620", borderRadius: 20, padding: "6px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: credits > 0 ? "#c9a84c" : "#555", display: "inline-block" }} />
            <span style={{ color: credits > 0 ? "#f5f0e8" : "#555" }}>{credits} credit{credits !== 1 ? "s" : ""}</span>
          </div>
          <button onClick={() => setShowPaywall(true)} style={{ background: "#c9a84c", color: "#0f0e0c", border: "none", borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            Get credits
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !image && fileInputRef.current.click()}
          style={{
            border: `1.5px dashed ${dragging ? "#c9a84c" : image ? "#2a2620" : "#3a3020"}`,
            borderRadius: 16,
            background: dragging ? "#1a1608" : image ? "#0d0c09" : "#131108",
            minHeight: image ? "auto" : 260,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: image ? "default" : "pointer",
            transition: "all 0.2s",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {image ? (
            <div style={{ width: "100%", position: "relative" }}>
              <img src={image} alt="Uploaded clothing" style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block", borderRadius: 14 }} />
              <button
                onClick={(e) => { e.stopPropagation(); setImage(null); setImageBase64(null); setResult(null); setError(null); }}
                style={{ position: "absolute", top: 12, right: 12, background: "rgba(15,14,12,0.85)", border: "0.5px solid #3a3020", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#f5f0e8", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>🧥</div>
              <p style={{ margin: 0, fontSize: 15, color: "#7a7060", fontWeight: 500 }}>Drop a photo or click to upload</p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#4a4030" }}>JPG, PNG, WEBP supported</p>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />

        {/* Controls */}
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          {image && (
            <button
              onClick={() => fileInputRef.current.click()}
              style={{ flex: 1, background: "transparent", border: "0.5px solid #2a2620", borderRadius: 10, padding: "12px", color: "#7a7060", fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >
              Change photo
            </button>
          )}
          <button
            onClick={handleAnalyze}
            disabled={!image || loading || credits <= 0}
            style={{
              flex: 2,
              background: (!image || loading || credits <= 0) ? "#1a1710" : "#c9a84c",
              color: (!image || loading || credits <= 0) ? "#4a4030" : "#0f0e0c",
              border: "none",
              borderRadius: 10,
              padding: "14px",
              fontSize: 15,
              fontWeight: 600,
              cursor: (!image || loading || credits <= 0) ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {loading ? "Analyzing..." : credits <= 0 ? "No credits remaining" : "✦ Analyze Value"}
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#1a0e0e", border: "0.5px solid #3a1818", borderRadius: 10, color: "#e57373", fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ marginTop: 32, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#7a7060", letterSpacing: 2, textTransform: "uppercase" }}>Consulting our fashion experts</div>
            <div style={{ marginTop: 16, display: "flex", gap: 6, justifyContent: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#c9a84c", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ marginTop: 28, animation: "slideUp 0.4s ease-out", background: "#131108", border: "0.5px solid #2a2620", borderRadius: 16, overflow: "hidden" }}>
            <style>{`@keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }`}</style>

            {/* Value Hero */}
            <div style={{ padding: "2rem", borderBottom: "0.5px solid #2a2620", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#7a7060", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Estimated Resale Value</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 56, fontWeight: 700, color: "#c9a84c", lineHeight: 1 }}>
                ${result.valueMid?.toFixed(0)}
              </div>
              <div style={{ marginTop: 8, fontSize: 14, color: "#4a4030" }}>
                ${result.valueLow?.toFixed(0)} — ${result.valueHigh?.toFixed(0)} range
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #2a2620", borderRight: "0.5px solid #2a2620" }}>
                <div style={{ fontSize: 11, color: "#4a4030", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Item</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{result.item}</div>
              </div>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #2a2620" }}>
                <div style={{ fontSize: 11, color: "#4a4030", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Brand</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{result.brand}</div>
              </div>
              <div style={{ padding: "1.25rem 1.5rem", borderRight: "0.5px solid #2a2620" }}>
                <div style={{ fontSize: 11, color: "#4a4030", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Condition</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: conditionColor(result.condition), display: "inline-block" }} />
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{result.condition}</span>
                </div>
              </div>
              <div style={{ padding: "1.25rem 1.5rem" }}>
                <div style={{ fontSize: 11, color: "#4a4030", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Style</div>
                <div style={{ fontSize: 14, color: "#a09070" }}>{result.style}</div>
              </div>
            </div>

            {/* Platforms */}
            {result.bestPlatforms?.length > 0 && (
              <div style={{ padding: "1.25rem 1.5rem", borderTop: "0.5px solid #2a2620" }}>
                <div style={{ fontSize: 11, color: "#4a4030", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Best platforms to sell</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.bestPlatforms.map(p => (
                    <span key={p} style={{ background: "#1a1710", border: "0.5px solid #2a2620", borderRadius: 20, padding: "4px 12px", fontSize: 13, color: "#c9a84c" }}>{p}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation */}
            <div style={{ padding: "1.25rem 1.5rem", borderTop: "0.5px solid #2a2620", background: "#0f0e0c" }}>
              <div style={{ fontSize: 11, color: "#4a4030", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Expert analysis</div>
              <p style={{ margin: 0, fontSize: 14, color: "#a09070", lineHeight: 1.7 }}>{result.explanation}</p>
            </div>

            {/* Sell Tip */}
            {result.sellTip && (
              <div style={{ padding: "1rem 1.5rem", borderTop: "0.5px solid #2a2620", background: "#1a1608", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "#c9a84c", fontSize: 16, flexShrink: 0 }}>✦</span>
                <p style={{ margin: 0, fontSize: 13, color: "#9a8860", lineHeight: 1.6 }}><strong style={{ color: "#c9a84c", fontWeight: 500 }}>Pro tip:</strong> {result.sellTip}</p>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, color: "#4a4030", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Previous valuations</div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
              {history.slice(1).map((h, i) => (
                <div key={i} onClick={() => { setImage(h.image); setResult(h.result); setImageBase64(null); }} style={{ flexShrink: 0, cursor: "pointer", width: 72, borderRadius: 10, overflow: "hidden", border: "0.5px solid #2a2620", background: "#131108" }}>
                  <img src={h.image} alt="" style={{ width: "100%", height: 72, objectFit: "cover", display: "block" }} />
                  <div style={{ padding: "4px 6px", fontSize: 11, color: "#c9a84c", fontWeight: 600 }}>${h.result.valueMid?.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Paywall Modal */}
      {showPaywall && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div style={{ background: "#131108", border: "0.5px solid #2a2620", borderRadius: 20, maxWidth: 640, width: "100%", overflow: "hidden" }}>
            <div style={{ padding: "2rem", borderBottom: "0.5px solid #2a2620", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#c9a84c" }}>Unlock more valuations</div>
                <div style={{ fontSize: 14, color: "#7a7060", marginTop: 4 }}>Choose a plan to continue analyzing your wardrobe</div>
              </div>
              <button onClick={() => setShowPaywall(false)} style={{ background: "transparent", border: "none", color: "#4a4030", fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
            </div>
            <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {PLANS.map(plan => (
                <div key={plan.id} style={{
                  background: plan.highlight ? "#1a1608" : "#0f0e0c",
                  border: plan.highlight ? "1.5px solid #c9a84c" : "0.5px solid #2a2620",
                  borderRadius: 14,
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  position: "relative",
                }}>
                  {plan.highlight && (
                    <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#c9a84c", color: "#0f0e0c", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>MOST POPULAR</div>
                  )}
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: "#f5f0e8" }}>{plan.name}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: plan.highlight ? "#c9a84c" : "#f5f0e8" }}>
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                  </div>
                  <div style={{ fontSize: 13, color: "#7a7060" }}>{plan.credits} valuations</div>
                  {plan.price > 0 && (
                    <div style={{ fontSize: 11, color: "#4a4030" }}>${(plan.price / plan.credits).toFixed(2)} each</div>
                  )}
                  <button
                    onClick={() => handlePurchase(plan)}
                    style={{
                      marginTop: 8,
                      background: plan.highlight ? "#c9a84c" : "transparent",
                      color: plan.highlight ? "#0f0e0c" : "#c9a84c",
                      border: plan.highlight ? "none" : "0.5px solid #c9a84c",
                      borderRadius: 8,
                      padding: "8px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {plan.price === 0 ? "Start free" : "Purchase"}
                  </button>
                </div>
              ))}
            </div>
            <div style={{ padding: "1rem 1.5rem", borderTop: "0.5px solid #2a2620", fontSize: 12, color: "#4a4030", textAlign: "center" }}>
              Credits never expire · Secure checkout · Cancel anytime
            </div>
          </div>
        </div>
      )}
    </div>
  );
}