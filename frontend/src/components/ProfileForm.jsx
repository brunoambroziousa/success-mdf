import { useState } from 'react';

const empty = { externalCode: '', cust_Name: '', cust_Age: '', cust_Gender: '' };

export default function ProfileForm({ initial, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => ({
    externalCode: initial?.externalCode || '',
    cust_Name: initial?.cust_Name || '',
    cust_Age: initial?.cust_Age ?? '',
    cust_Gender: initial?.cust_Gender || '',
  }));

  const setField = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      externalCode: values.externalCode.trim(),
      cust_Name: values.cust_Name.trim(),
      cust_Age: Number(values.cust_Age),
      cust_Gender: values.cust_Gender || null,
    };
    if (!payload.externalCode || !payload.cust_Name || Number.isNaN(payload.cust_Age)) {
      alert('externalCode, Name, and Age are required.');
      return;
    }
    onSubmit(payload);
    if (!initial) setValues(empty);
  };

  return (
    <form onSubmit={submit}>
      <div className="row">
        <div>
          <label>externalCode *</label>
          <input
            value={values.externalCode}
            onChange={setField('externalCode')}
            disabled={!!initial}
            maxLength={128}
            required
          />
        </div>
        <div>
          <label>Name *</label>
          <input value={values.cust_Name} onChange={setField('cust_Name')} maxLength={255} required />
        </div>
        <div>
          <label>Age *</label>
          <input type="number" min="0" max="999" value={values.cust_Age} onChange={setField('cust_Age')} required />
        </div>
        <div>
          <label>Gender</label>
          <select value={values.cust_Gender} onChange={setField('cust_Gender')}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button type="submit">{initial ? 'Save changes' : 'Create profile'}</button>
        {onCancel && <button type="button" className="secondary" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
