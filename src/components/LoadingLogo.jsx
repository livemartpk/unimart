// ============================================
// UniMart - Animated Logo Loader
// Shows the UniMart wordmark with each letter
// waving up/down in sequence, like Daraz's
// branded loading animation.
// ============================================

const WORD = ["U", "n", "i", "M", "a", "r", "t"];
const GOLD_START_INDEX = 3; // "M" onward is gold, matching the header logo

export default function LoadingLogo({ label, fullPage = true, size = 34 }) {
  const content = (
    <div style={styles.wrap}>
      <div style={styles.word}>
        {WORD.map((letter, i) => (
          <span
            key={i}
            style={{
              ...styles.letter,
              fontSize: size,
              color: i >= GOLD_START_INDEX ? "#D4AF37" : "#0B3D2E",
              animationDelay: `${i * 0.09}s`
            }}
          >
            {letter}
          </span>
        ))}
      </div>
      {label && <p style={styles.label}>{label}</p>}
      <style>{`
        @keyframes umLetterWave {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );

  if (!fullPage) return content;

  return <div style={styles.fullPage}>{content}</div>;
}

const styles = {
  fullPage: { minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" },
  wrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  word: { display: "flex" },
  letter: {
    fontFamily: "Georgia, serif",
    fontWeight: 900,
    display: "inline-block",
    animation: "umLetterWave 1.1s ease-in-out infinite"
  },
  label: { fontSize: 12.5, color: "#888", fontWeight: 600, letterSpacing: 0.3, margin: 0 }
};
