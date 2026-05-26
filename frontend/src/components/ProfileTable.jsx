export default function ProfileTable({ profiles, onEdit, onDelete }) {
  if (!profiles.length) return <p>No profiles yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>externalCode</th>
          <th>Name</th>
          <th>Age</th>
          <th>Gender</th>
          <th style={{ width: 180 }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {profiles.map((p) => (
          <tr key={p.externalCode}>
            <td>{p.externalCode}</td>
            <td>{p.cust_Name}</td>
            <td>{p.cust_Age}</td>
            <td>{p.cust_Gender || '—'}</td>
            <td>
              <button onClick={() => onEdit(p)}>Edit</button>
              <button className="danger" onClick={() => onDelete(p.externalCode)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
