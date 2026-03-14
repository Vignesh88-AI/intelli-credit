import { useState } from "react"

const API_BASE = import.meta.env.VITE_API_URL || "https://intelli-credit-7kzw.onrender.com"

export default function QuickAppraisalInline() {
  const [companyName, setCompanyName] = useState("")
  const [sector, setSector] = useState("")
  const [loanAmount, setLoanAmount] = useState("")
  const [tenure, setTenure] = useState("")
  const [interestRate, setInterestRate] = useState("")
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState("")
  const [result, setResult] = useState(null)
  const [error, setError] = useState("")

  const sectors = ["NBFC","Manufacturing","IT/Technology","Real Estate",
                   "Healthcare","Retail","Infrastructure","Agriculture","Others"]

  const decisionColor = d =>
    d === "APPROVE" ? "#16a34a" :
    d?.includes("CONDITION") || d?.includes("REFER") ? "#d97706" : "#dc2626"

  const riskColor = r => ({
    LOW: "#16a34a", MEDIUM: "#d97706", HIGH: "#dc2626", CRITICAL: "#991b1b"
  }[r] || "#6b7280")

  async function runQuick() {
    if (!companyName.trim() || !file) {
      setError("Company name and document are required")
      return
    }
    setError("")
    setLoading(true)
    setLoadingMsg("Reading document...")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("company_name", companyName)
    formData.append("sector", sector)
    formData.append("loan_amount", loanAmount || "50")
    formData.append("tenure", tenure)
    formData.append("interest_rate", interestRate)

    try {
      setLoadingMsg("AI extracting financials...")
      await new Promise(r => setTimeout(r, 800))
      setLoadingMsg("Calculating credit score...")
      await new Promise(r => setTimeout(r, 600))
      setLoadingMsg("Running web research...")

      const res = await fetch(`${API_BASE}/api/quick-appraisal`, {
        method: "POST",
        body: formData
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
      setLoadingMsg("")
    }
  }

  // ── INPUT SCREEN ──
  if (!result && !loading) return (
    <div className="quick-form">
      <div className="quick-row">
        <div className="quick-field">
          <label>Company Name *</label>
          <input
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Legal Entity Name" />
        </div>
        <div className="quick-field">
          <label>Sector</label>
          <select value={sector} onChange={e => setSector(e.target.value)}>
            <option value="">Select Sector</option>
            {sectors.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="quick-row">
        <div className="quick-field">
          <label>Loan Amount (Cr)</label>
          <input type="number" value={loanAmount}
            onChange={e => setLoanAmount(e.target.value)} placeholder="50" />
        </div>
        <div className="quick-field">
          <label>Tenure (Months)</label>
          <input type="number" value={tenure}
            onChange={e => setTenure(e.target.value)} placeholder="e.g. 36" />
        </div>
        <div className="quick-field">
          <label>Interest Rate (%)</label>
          <input type="number" value={interestRate}
            onChange={e => setInterestRate(e.target.value)} placeholder="e.g. 11.5" />
        </div>
      </div>

      <div className="quick-upload" onClick={() => document.getElementById('qf').click()}>
        <input id="qf" type="file" accept=".pdf,.xlsx,.xls,.docx"
          style={{display:'none'}} onChange={e => setFile(e.target.files[0])} />
        {file ? (
          <div className="file-selected">
            <span>{file.name}</span>
            <span className="file-size">{(file.size/1024/1024).toFixed(2)} MB</span>
          </div>
        ) : (
          <div className="upload-prompt">
            <p>Click to upload financial document</p>
            <p className="upload-hint">Annual Report, ALM, Portfolio Data — any one document works</p>
          </div>
        )}
      </div>

      {error && <p className="quick-error">{typeof error === 'string' ? error : JSON.stringify(error)}</p>}

      <button className="btn-run-quick" onClick={runQuick}
        disabled={!companyName || !file || !sector}>
        Run Quick Appraisal
      </button>
    </div>
  )

  // ── LOADING SCREEN ──
  if (loading) return (
    <div className="quick-loading">
      <div className="loading-spinner"></div>
      <p className="loading-msg">{loadingMsg}</p>
      <div className="loading-steps">
        <span>Document extraction</span>
        <span>Credit scoring</span>
        <span>Web research</span>
        <span>Report generation</span>
      </div>
    </div>
  )

  // ── RESULT SCREEN ──
  const s = result?.scoring || {}
  const intel = result?.intelligence || {}

  return (
    <div className="quick-result">

      {/* Header */}
      <div className="qr-header">
        <div>
          <p className="qr-label">QUICK APPRAISAL RESULT</p>
          <h2 className="qr-company">{companyName}</h2>
          <span className="qr-sector">{sector}</span>
        </div>
        <div className="qr-decision"
          style={{color: decisionColor(s.decision), borderColor: decisionColor(s.decision)}}>
          {s.decision}
        </div>
      </div>

      {/* Score */}
      <div className="qr-score-row">
        <div className="qr-score-circle">
          <span className="qr-score-num">{s.score}</span>
          <span className="qr-score-denom">/95</span>
        </div>
        <div className="qr-terms">
          <div className="qr-term">
            <span className="qr-term-label">RECOMMENDED LIMIT</span>
            <span className="qr-term-val">
              {s.recommended_amount > 0 ? `${s.recommended_amount} Cr` : "Rejected"}
            </span>
          </div>
          <div className="qr-term">
            <span className="qr-term-label">INTEREST RATE</span>
            <span className="qr-term-val">{s.recommended_rate}</span>
          </div>
          <div className="qr-term">
            <span className="qr-term-label">TENOR</span>
            <span className="qr-term-val">{tenure} Months</span>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {s.reasoning && (
        <div className="qr-reasoning">
          <p className="qr-section-label">REASONING ENGINE</p>
          <p>{s.reasoning}</p>
        </div>
      )}

      {/* Flags */}
      <div className="qr-flags">
        <div className="qr-red">
          <p className="qr-section-label">CRITICAL RISK ALERTS</p>
          {s.red_flags?.length > 0
            ? s.red_flags.map((f,i) => <p key={i}>• {f}</p>)
            : <p>No critical risk alerts identified.</p>}
        </div>
        <div className="qr-green">
          <p className="qr-section-label">POSITIVE INDICATORS</p>
          {s.green_flags?.length > 0
            ? s.green_flags.map((f,i) => <p key={i}>• {f}</p>)
            : <p>Standard industry benchmarks met.</p>}
        </div>
      </div>

      {/* Web Intelligence */}
      {intel.risk_level && (
        <div className="qr-intel">
          <p className="qr-section-label">WEB INTELLIGENCE</p>
          <span className="qr-risk-badge"
            style={{color: riskColor(intel.risk_level), borderColor: riskColor(intel.risk_level)}}>
            Risk: {intel.risk_level}
          </span>
          {intel.key_findings?.length > 0 && (
            <ul className="qr-findings">
              {intel.key_findings.map((f,i) => <li key={i}>• {f}</li>)}
            </ul>
          )}
          {intel.summary && <p className="qr-summary">{intel.summary}</p>}
        </div>
      )}

      {/* Actions */}
      <div className="qr-actions">
        <button className="btn-outline-sm" onClick={() => setResult(null)}>
          New Appraisal
        </button>
        {result?.report_id && (
          <button className="btn-primary-sm"
            onClick={() => window.open(`${API_BASE}/api/quick-report/${result.report_id}`)}>
            Download CAM Report
          </button>
        )}
      </div>
    </div>
  )
}
