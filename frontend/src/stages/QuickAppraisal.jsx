import { useState } from "react"
import "./styles/quick.css"

export default function QuickAppraisal({ onBack }) {
  const [step, setStep] = useState("input") // input | loading | result
  const [form, setForm] = useState({
    company_name: "",
    sector: "NBFC",
    loan_amount: "",
    tenure: "36",
    interest_rate: "11.5"
  })
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [progress, setProgress] = useState("")

  const sectors = ["NBFC", "Manufacturing", "IT/Technology", "Real Estate", 
                   "Healthcare", "Retail", "Infrastructure", "Agriculture", "Others"]

  async function runQuickAppraisal() {
    if (!form.company_name || !file) return
    setStep("loading")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("company_name", form.company_name)
    formData.append("sector", form.sector)
    formData.append("loan_amount", form.loan_amount)
    formData.append("tenure", form.tenure)
    formData.append("interest_rate", form.interest_rate)

    try {
      setProgress("Extracting financial data from document...")
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/quick-appraisal`, {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      setResult(data)
      setStep("result")
    } catch (err) {
      console.error(err)
      setProgress("Error occurred. Please try again.")
    }
  }

  if (step === "input") return (
    <div className="quick-container">
      <div className="quick-header">
        <h1>Quick Appraisal</h1>
        <p>Upload one document + enter company details - get instant credit assessment</p>
      </div>

      <div className="quick-form">
        <div className="form-row">
          <div className="form-group">
            <label>Company Name *</label>
            <input value={form.company_name} 
              onChange={e => setForm({...form, company_name: e.target.value})}
              placeholder="e.g. Kinara Capital Private Limited" />
          </div>
          <div className="form-group">
            <label>Sector *</label>
            <select value={form.sector} 
              onChange={e => setForm({...form, sector: e.target.value})}>
              {sectors.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Loan Amount (INR Cr)</label>
            <input type="number" value={form.loan_amount} 
              onChange={e => setForm({...form, loan_amount: e.target.value})}
              placeholder="50" />
          </div>
          <div className="form-group">
            <label>Tenure (Months)</label>
            <input type="number" value={form.tenure} 
              onChange={e => setForm({...form, tenure: e.target.value})}
              placeholder="36" />
          </div>
          <div className="form-group">
            <label>Interest Rate (%)</label>
            <input type="number" value={form.interest_rate} 
              onChange={e => setForm({...form, interest_rate: e.target.value})}
              placeholder="11.5" />
          </div>
        </div>

        <div className="upload-zone" onClick={() => document.getElementById('qfile').click()}>
          <input id="qfile" type="file" accept=".pdf,.xlsx,.xls,.docx" 
            style={{display:'none'}}
            onChange={e => setFile(e.target.files[0])} />
          {file ? (
            <div className="file-selected">
              <span>{file.name}</span>
              <span className="file-size">{(file.size/1024/1024).toFixed(2)} MB</span>
            </div>
          ) : (
            <div className="upload-prompt">
              <span className="upload-icon">UPLOAD</span>
              <p>Upload any financial document</p>
              <p className="upload-hint">Annual Report, ALM, Borrowing Profile, Portfolio Data - any one works</p>
            </div>
          )}
        </div>

        <div style={{display:'flex', gap:'12px'}}>
          <button className="btn-outline" onClick={onBack}>Back</button>
          <button className="btn-run-quick" 
            onClick={runQuickAppraisal}
            disabled={!form.company_name || !file}>
            Run Quick Appraisal
          </button>
        </div>
      </div>
    </div>
  )

  if (step === "loading") return (
    <div className="quick-loading">
      <div className="loading-spinner"></div>
      <h2>Analyzing...</h2>
      <p>{progress}</p>
      <div className="loading-steps">
        <span>Extracting data</span>
        <span>Web research</span>
        <span>Scoring</span>
        <span>Generating report</span>
      </div>
    </div>
  )

  if (step === "result" && result) return (
    <div className="quick-result">
      <button onClick={() => setStep("input")} className="back-btn">Back</button>
      <div className="result-header">
        <div>
          <p className="result-label">QUICK APPRAISAL RESULT</p>
          <h1>{form.company_name}</h1>
          <span className="sector-badge">{form.sector}</span>
        </div>
        <div className={`decision-badge decision-${result.scoring?.decision?.toLowerCase().replace(/ /g,'-')}`}>
          {result.scoring?.decision}
        </div>
      </div>

      <div className="score-section">
        <div className="score-circle" style={{
          background: `conic-gradient(${result.scoring?.score >= 70 ? '#F5A623' : result.scoring?.score >= 45 ? '#FF6B35' : '#E53935'} ${result.scoring?.score * (360/95)}deg, #1a2332 0deg)`
        }}>
          <div className="score-inner">
            <span className="score-number">{result.scoring?.score}</span>
            <span className="score-label">/95</span>
          </div>
        </div>
        <div className="score-breakdown">
          {result.scoring?.five_cs && Object.entries(result.scoring.five_cs).map(([key, val]) => (
            <div key={key} className="cs-row">
              <span className="cs-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              <div className="cs-bar">
                <div className="cs-fill" style={{width: `${(val.score/(key==='conditions'?15:20))*100}%`}}></div>
              </div>
              <span className="cs-score">{val.score}/{key==='conditions'?15:20}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="loan-terms-row">
        <div className="term-box">
          <span className="term-label">RECOMMENDED LIMIT</span>
          <span className="term-value">INR {result.scoring?.recommended_amount} Cr</span>
        </div>
        <div className="term-box">
          <span className="term-label">INTEREST RATE</span>
          <span className="term-value">{result.scoring?.recommended_rate}</span>
        </div>
        <div className="term-box">
          <span className="term-label">TENOR</span>
          <span className="term-value">{form.tenure} Months</span>
        </div>
      </div>

      <div className="reasoning-box">
        <h3>Reasoning Engine</h3>
        <p>{result.scoring?.reasoning}</p>
      </div>

      <div className="flags-row">
        <div className="red-flags">
          <h4>Critical Risk Alerts</h4>
          {result.scoring?.red_flags?.map((f,i) => <p key={i}>- {f}</p>)}
        </div>
        <div className="green-flags">
          <h4>Positive Indicators</h4>
          {result.scoring?.green_flags?.map((f,i) => <p key={i}>- {f}</p>)}
        </div>
      </div>

      {result.findings && result.findings.length > 0 && (
        <div className="web-intel-box">
          <h3>Web Intelligence</h3>
          <div className="findings-list">
            {result.findings.map((f,i) => (
              <div key={i} className="finding-item">
                <strong>{f.title}</strong>
                <p>{f.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.scoring?.swot && (
        <div className="swot-grid">
          {Object.entries(result.scoring.swot).map(([key, items]) => (
            <div key={key} className={`swot-quadrant swot-${key}`}>
              <h4>{key.toUpperCase()}</h4>
              {items?.map((item, i) => <p key={i}>- {item}</p>)}
            </div>
          ))}
        </div>
      )}

      <div className="quick-actions">
        <button onClick={() => { setStep("input"); setResult(null); setFile(null) }} 
          className="btn-outline">New Appraisal</button>
        <button onClick={() => window.open(`${import.meta.env.VITE_API_URL}/api/quick-report/${result.report_id}`)}
          className="btn-primary">Download CAM Report</button>
      </div>
    </div>
  )
}
