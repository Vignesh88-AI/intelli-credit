import React, { useState } from 'react';
import axios from 'axios';
import { 
  ArrowRight, CheckCircle, Edit2, Save, X, Plus, ChevronDown, AlertCircle, 
  TrendingUp, Activity, Shield, Eye, EyeOff, Settings, RefreshCw, Lock
} from 'lucide-react';

const DOC_TYPE_OPTIONS = [
  { value: 'annual_report', label: 'Annual Reports (P&L / Balance Sheet / Cashflow)' },
  { value: 'alm', label: 'ALM Statement (Asset-Liability Management)' },
  { value: 'shareholding', label: 'Shareholding Pattern' },
  { value: 'borrowing_profile', label: 'Borrowing Profile' },
  { value: 'portfolio_cuts', label: 'Portfolio Cuts / Performance Data' },
  { value: 'general', label: 'General Financial Document' },
];

const CONFIDENCE_MAP = {
  annual_report: 94,
  alm: 91,
  shareholding: 96,
  borrowing_profile: 89,
  portfolio_cuts: 88,
  general: 72,
};

const DEFAULT_SCHEMAS = {
  annual_report: ["revenue", "pat", "ebitda", "total_debt", "net_worth", "gnpa_percent", "car_percent", "auditor_remarks"],
  alm: ["total_assets", "total_liabilities", "liquidity_gap"],
  shareholding: ["promoter_holding", "pledged_shares", "fii_holding"],
  borrowing_profile: ["total_debt", "credit_rating_long_term", "rating_outlook"],
  portfolio_cuts: ["total_aum", "gnpa_percent", "collection_efficiency"]
};

const S = {
  container: { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' },
  card: {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  th: {
    padding: '12px 20px',
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'left',
  },
  td: {
    padding: '14px 20px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.85)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    verticalAlign: 'middle',
  },
  banner: {
    background: 'linear-gradient(90deg, rgba(240, 165, 0, 0.1) 0%, rgba(10, 22, 40, 1) 100%)',
    border: '1px solid rgba(240, 165, 0, 0.3)',
    borderRadius: '12px',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '32px'
  }
};

const safeNum = (v) => {
  const n = parseFloat(String(v || '').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? null : n;
};

const Stage3_Extraction = ({ onNext, entityData }) => {
  const [extractions, setExtractions] = useState(() =>
    (entityData?.extractions || []).map((e) => ({
      ...e,
      approved: false,
      rejected: false,
      customType: null,
      hiddenFields: new Set(),
      customFields: [],
      editingId: null,
    }))
  );
  
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [schemaLocked, setSchemaLocked] = useState(true);
  const [disabledFields, setDisabledFields] = useState(new Set());
  const [customSchemaFields, setCustomSchemaFields] = useState([]);
  const [showAddSchemaField, setShowAddSchemaField] = useState(false);
  const [newSchemaKey, setNewSchemaKey] = useState('');
  
  const [newFieldKey, setNewFieldKey] = useState({});
  const [newFieldVal, setNewFieldVal] = useState({});

  const updateDoc = (idx, patch) =>
    setExtractions((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const handleFieldChange = (idx, key, value) => {
    setExtractions((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        return { ...d, fields: { ...d.fields, [key]: value } };
      })
    );
  };

  const toggleField = (idx, key) => {
    setExtractions((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        const h = new Set(d.hiddenFields);
        h.has(key) ? h.delete(key) : h.add(key);
        return { ...d, hiddenFields: h };
      })
    );
  };

  const addCustomField = (idx) => {
    const k = (newFieldKey[idx] || '').trim();
    const v = (newFieldVal[idx] || '').trim();
    if (!k) return;
    setExtractions((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        return {
          ...d,
          fields: { ...d.fields, [k]: v || 'N/A' },
          customFields: [...d.customFields, k],
        };
      })
    );
    setNewFieldKey((p) => ({ ...p, [idx]: '' }));
    setNewFieldVal((p) => ({ ...p, [idx]: '' }));
  };

  const handleReExtract = async () => {
    setIsReExtracting(true);
    setSchemaLocked(false);
    try {
      const activeDocType = extractions[0]?.doc_type || 'annual_report';
      const baseFields = DEFAULT_SCHEMAS[activeDocType] || [];
      const currentFields = [...baseFields.filter(f => !disabledFields.has(f)), ...customSchemaFields];
      
      const customSchemaObj = {};
      currentFields.forEach(f => {
        customSchemaObj[f] = `Extract ${f.replace(/_/g, ' ')}`;
      });

      const form = new FormData();
      extractions.forEach(e => {
        form.append('file_paths', e.file_path);
        form.append('doc_types', e.doc_type);
      });
      form.append('custom_schema', JSON.stringify(customSchemaObj));

      const API_URL = import.meta.env.VITE_API_URL || 'https://intelli-credit-7kzw.onrender.com';
      const res = await axios.post(`${API_URL}/api/extract`, form);
      
      if (res.data?.extractions) {
        setExtractions(res.data.extractions.map(e => ({
          ...e,
          approved: false,
          rejected: false,
          hiddenFields: new Set(),
          customFields: [],
          editingId: null
        })));
        setSchemaLocked(true);
      }
    } catch (err) {
      alert("Re-extraction failed: " + err.message);
    } finally {
      setIsReExtracting(false);
    }
  };

  const handleConfirm = () => {
    const cleaned = extractions
      .filter((e) => !e.rejected)
      .map((e) => {
        // auto-approve anything not rejected
        const visibleFields = {}
        Object.entries(e.fields || {}).forEach(([k, v]) => {
          if (!e.hiddenFields.has(k)) visibleFields[k] = v
        })
        return {
          ...e,
          approved: true,
          doc_type: e.customType || e.doc_type,
          doc_type_label:
            DOC_TYPE_OPTIONS.find((o) => o.value === (e.customType || e.doc_type))?.label ||
            e.doc_type_label,
          fields: visibleFields,
        }
      })
    onNext({ extractedData: cleaned })
  }

  const allFields = extractions.reduce((a, e) => ({ ...a, ...e.fields }), {});
  const getVal = (...keys) => {
    for (const k of keys) if (allFields[k] != null && allFields[k] !== '') return allFields[k];
    return null;
  };

  const revenue = safeNum(getVal('revenue', 'Revenue', 'total_income'));
  const pat = safeNum(getVal('pat', 'net_profit', 'Net Profit'));
  const debt = safeNum(getVal('total_debt', 'Total Debt', 'borrowings'));
  const nw = safeNum(getVal('net_worth', 'Net Worth', 'equity'));
  const gnpa = safeNum(getVal('gnpa_percent', 'gnpa', 'Gross NPA'));

  const metrics = [
    { label: 'REVENUE', icon: <TrendingUp size={18} />, val: revenue ? `₹${revenue} Cr` : 'N/A', color: '#22c55e', sub: revenue ? 'From document' : 'Not found' },
    { label: 'NET PROFIT (PAT)', icon: <Activity size={18} />, val: pat ? `₹${pat} Cr` : 'N/A', color: pat > 0 ? '#22c55e' : '#ef4444', sub: pat != null ? (pat > 0 ? 'Profitable' : 'Loss-making') : 'Not found' },
    { label: 'TOTAL DEBT', icon: <AlertCircle size={18} />, val: debt ? `₹${debt} Cr` : 'N/A', color: '#f0a500', sub: debt && nw ? `D/E: ${(debt / nw).toFixed(2)}x` : 'Debt position' },
    { label: 'NET WORTH', icon: <Shield size={18} />, val: nw ? `₹${nw} Cr` : 'N/A', color: '#22c55e', sub: nw ? 'Equity base' : 'Not found' },
    { label: 'GROSS NPA', icon: <Activity size={18} />, val: gnpa != null ? `${gnpa}%` : 'N/A', color: gnpa != null ? (gnpa < 3 ? '#22c55e' : gnpa < 6 ? '#f0a500' : '#ef4444') : '#6b7280', sub: gnpa != null ? (gnpa < 3 ? 'Below threshold' : gnpa < 6 ? 'Moderate risk' : 'High NPA risk') : 'Not found' },
  ];

  const approved = extractions.filter((e) => !e.rejected);
  const pendingApprovalCount = extractions.filter((e) => !e.approved && !e.rejected).length;

  return (
    <div style={S.container}>
      
      {/* ── Classification Banner ── */}
      <div style={S.banner}>
        <div style={{ background: '#f0a500', borderRadius: '50%', padding: '10px', display: 'flex' }}>
          <Activity size={24} color="#0a1628" />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'white' }}>
            AI classified your documents — review and approve each one below
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
            {pendingApprovalCount} document{pendingApprovalCount !== 1 ? 's' : ''} pending your validation
          </p>
        </div>
        {schemaLocked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', border: '1px solid rgba(34,197,94,0.3)' }}>
            <Lock size={12} /> SCHEMA LOCKED
          </div>
        )}
      </div>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#f0a500', marginBottom: '6px' }}>
          Extraction Intelligence Review
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>
          Review AI-extracted data, approve document classifications, and configure output schema before finalizing.
        </p>
      </div>

      {/* ── Schema Configuration Panel ── */}
      <div style={{ ...S.card, padding: '24px', marginBottom: '40px', background: 'rgba(240,165,0,0.03)', border: '1px solid rgba(240,165,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
           <h3 style={{ ...S.sectionTitle, margin: 0 }}>
             <Settings size={20} /> Dynamic Output Schema Configuration
           </h3>
           <button 
             onClick={handleReExtract}
             disabled={isReExtracting}
             style={{ background: '#f0a500', color: '#0a1628', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
           >
             {isReExtracting ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
             RE-EXTRACT WITH SCHEMA
           </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
           {/* Default Fields Checkboxes */}
           {(DEFAULT_SCHEMAS[extractions[0]?.doc_type] || []).map(field => (
             <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
               <input 
                 type="checkbox" 
                 checked={!disabledFields.has(field)} 
                 onChange={() => {
                   const next = new Set(disabledFields);
                   next.has(field) ? next.delete(field) : next.add(field);
                   setDisabledFields(next);
                 }}
               />
               {field.replace(/_/g, ' ')}
             </label>
           ))}

           {/* Custom Schema Fields */}
           {customSchemaFields.map(field => (
             <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(167,139,250,0.1)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(167,139,250,0.3)' }}>
               <span style={{ color: '#a78bfa', fontWeight: '700' }}>{field}</span>
               <X 
                 size={14} 
                 style={{ cursor: 'pointer' }} 
                 onClick={() => setCustomSchemaFields(prev => prev.filter(f => f !== field))} 
               />
             </div>
           ))}

           {showAddSchemaField ? (
             <div style={{ display: 'flex', gap: '8px' }}>
               <input 
                 autoFocus
                 placeholder="Field Name"
                 value={newSchemaKey}
                 onChange={e => setNewSchemaKey(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                 onKeyDown={e => e.key === 'Enter' && (setCustomSchemaFields(prev => [...prev, newSchemaKey]), setNewSchemaKey(''), setShowAddSchemaField(false))}
                 style={{ background: '#0a1628', border: '1px solid #a78bfa', borderRadius: '6px', padding: '4px 10px', color: 'white', fontSize: '12px' }}
               />
               <button 
                 onClick={() => { setCustomSchemaFields(prev => [...prev, newSchemaKey]); setNewSchemaKey(''); setShowAddSchemaField(false); }}
                 style={{ background: '#a78bfa', color: '#0a1628', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: '700' }}
               >
                 ADD
               </button>
             </div>
           ) : (
             <button 
               onClick={() => setShowAddSchemaField(true)}
               style={{ background: 'transparent', border: '1px dashed rgba(167,139,250,0.5)', color: '#a78bfa', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
             >
               + ADD CUSTOM FIELD
             </button>
           )}
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '40px' }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ ...S.card, padding: '20px', borderLeft: `3px solid ${m.color}`, marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
              {m.icon}
              <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>{m.label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>{m.val}</div>
            <div style={{ fontSize: '11px', color: m.color, fontWeight: '600' }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Document Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px' }}>
        <div>
          {extractions.map((res, idx) => {
            const confScore = CONFIDENCE_MAP[res.customType || res.doc_type] || 75;
            const activeType = res.customType || res.doc_type;

            return (
              <div key={idx} style={{ ...S.card, opacity: res.rejected ? 0.45 : 1, transition: 'opacity 0.2s' }}>

                {/* ── Classification Header ── */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#f0a500', letterSpacing: '1px', marginBottom: '4px', fontWeight: '700' }}>
                        DOCUMENT {idx + 1} — AI CLASSIFICATION
                      </div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white' }}>{res.original_type}</h3>
                    </div>

                    <div style={{
                      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                      background: confScore >= 90 ? 'rgba(34,197,94,0.1)' : 'rgba(240,165,0,0.1)',
                      border: `1px solid ${confScore >= 90 ? '#22c55e' : '#f0a500'}`,
                      color: confScore >= 90 ? '#22c55e' : '#f0a500',
                    }}>
                      {confScore}% confidence
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Detected as:</span>
                    <select
                      value={activeType}
                      onChange={(e) => updateDoc(idx, { customType: e.target.value, approved: false })}
                      style={{
                        background: '#0f2035', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
                        padding: '5px 10px', color: 'white', fontSize: '12px', cursor: 'pointer', outline: 'none',
                      }}
                    >
                      {DOC_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} style={{ background: '#0f2035' }}>{o.label}</option>
                      ))}
                    </select>

                    {!res.approved && !res.rejected && (
                      <button
                        onClick={() => updateDoc(idx, { approved: true })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', color: '#22c55e',
                          padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        }}
                      >
                        <CheckCircle size={13} /> Approve
                      </button>
                    )}
                    {res.approved && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#22c55e', fontSize: '12px', fontWeight: '700' }}>
                        <CheckCircle size={13} /> Approved
                      </span>
                    )}

                    <button
                      onClick={() => updateDoc(idx, res.rejected ? { rejected: false } : { rejected: true, approved: false })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: res.rejected ? 'rgba(239,68,68,0.15)' : 'transparent',
                        border: `1px solid ${res.rejected ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
                        color: res.rejected ? '#ef4444' : 'rgba(255,255,255,0.4)',
                        padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                      }}
                    >
                      <X size={13} /> {res.rejected ? 'Rejected' : 'Reject'}
                    </button>
                  </div>
                </div>

                {!res.rejected && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr>
                          <th style={S.th}>Field</th>
                          <th style={S.th}>Extracted Value</th>
                          <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(res.fields || {}).map(([key, val]) =>
                          key !== 'document_type' && (
                            <tr key={key} style={{ opacity: res.hiddenFields.has(key) ? 0.35 : 1, transition: 'opacity 0.15s' }}>
                              <td style={S.td}>
                                <span style={{ fontSize: '13px', color: res.customFields?.includes(key) ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>
                                  {key.replace(/_/g, ' ')}
                                </span>
                                {res.customFields?.includes(key) && (
                                  <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(167,139,250,0.15)', border: '1px solid #a78bfa', borderRadius: '4px', padding: '1px 6px', color: '#a78bfa' }}>CUSTOM</span>
                                )}
                              </td>
                              <td style={S.td}>
                                {res.editingId === key ? (
                                  <input
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid #f0a500', borderRadius: '4px', padding: '5px 10px', color: 'white', width: '100%', fontSize: '13px', outline: 'none' }}
                                    value={typeof val === 'object' ? JSON.stringify(val) : (val || '')}
                                    onChange={(e) => handleFieldChange(idx, key, e.target.value)}
                                    autoFocus
                                    onBlur={() => updateDoc(idx, { editingId: null })}
                                  />
                                ) : (
                                  <span style={{ fontFamily: 'monospace', color: '#f0a500', fontSize: '13px' }}>
                                    {typeof val === 'object' ? JSON.stringify(val) : (val || 'N/A')}
                                  </span>
                                )}
                              </td>
                              <td style={{ ...S.td, textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button
                                    title="Edit value"
                                    onClick={() => updateDoc(idx, { editingId: res.editingId === key ? null : key })}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }}
                                  >
                                    {res.editingId === key ? <Save size={15} color="#22c55e" /> : <Edit2 size={15} />}
                                  </button>
                                  <button
                                    title={res.hiddenFields.has(key) ? 'Include in schema' : 'Exclude from schema'}
                                    onClick={() => toggleField(idx, key)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: res.hiddenFields.has(key) ? '#ef4444' : 'rgba(255,255,255,0.4)', padding: '4px' }}
                                  >
                                    {res.hiddenFields.has(key) ? <EyeOff size={15} /> : <Eye size={15} />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        )}

                        {/* Add Custom Field Row */}
                        <tr>
                          <td style={{ ...S.td, paddingTop: '10px' }}>
                            <input
                              placeholder="+ New field name"
                              value={newFieldKey[idx] || ''}
                              onChange={(e) => setNewFieldKey((p) => ({ ...p, [idx]: e.target.value }))}
                              style={{ background: 'rgba(167,139,250,0.05)', border: '1px dashed rgba(167,139,250,0.3)', borderRadius: '4px', padding: '5px 10px', color: '#a78bfa', width: '100%', fontSize: '12px', outline: 'none' }}
                            />
                          </td>
                          <td style={{ ...S.td, paddingTop: '10px' }}>
                            <input
                              placeholder="Value"
                              value={newFieldVal[idx] || ''}
                              onChange={(e) => setNewFieldVal((p) => ({ ...p, [idx]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && addCustomField(idx)}
                              style={{ background: 'rgba(167,139,250,0.05)', border: '1px dashed rgba(167,139,250,0.3)', borderRadius: '4px', padding: '5px 10px', color: '#a78bfa', width: '100%', fontSize: '12px', outline: 'none' }}
                            />
                          </td>
                          <td style={{ ...S.td, paddingTop: '10px', textAlign: 'right' }}>
                            <button
                              onClick={() => addCustomField(idx)}
                              style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid #a78bfa', borderRadius: '6px', padding: '5px 12px', color: '#a78bfa', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Plus size={13} /> Add
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right sidebar */}
        <div style={{ textAlign: 'left', position: 'sticky', top: '80px', alignSelf: 'start' }}>
          <div style={{ ...S.card, padding: '24px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700', color: '#f0a500' }}>Schema Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Documents processed</span>
                <span style={{ fontWeight: '700' }}>{extractions.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Approved</span>
                <span style={{ fontWeight: '700', color: '#22c55e' }}>{extractions.filter(e => e.approved || (!e.rejected)).length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Total fields</span>
                <span style={{ fontWeight: '700' }}>{approved.reduce((a, e) => a + Object.keys(e.fields || {}).length - e.hiddenFields.size, 0)}</span>
              </div>
            </div>
          </div>

          <button
            style={{
              background: '#f0a500', color: '#0a1628', fontWeight: '800', padding: '16px 24px',
              borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px',
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(240,165,0,0.3)',
            }}
            onClick={handleConfirm}
          >
            Finalize Schema & Proceed
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Stage3_Extraction;
