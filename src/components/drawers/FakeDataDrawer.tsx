import { useState } from 'react';
import type { ToolDefinition } from '../../types/tools';

type AlertType = 'warning' | 'danger' | 'success' | 'info';
type FakeFormat = 'text' | 'json' | 'csv';

interface FakeDataDrawerProps {
  activeTool?: Pick<ToolDefinition, 'id' | 'label'> | null;
  onResult: (label: string, result: string) => void;
  showAlert: (message: string, type: AlertType) => void;
}

const FIRST_NAMES = [
  'James',
  'Mary',
  'Robert',
  'Patricia',
  'John',
  'Jennifer',
  'Michael',
  'Linda',
  'David',
  'Elizabeth',
  'William',
  'Barbara',
  'Richard',
  'Susan',
  'Joseph',
  'Jessica',
  'Thomas',
  'Sarah',
  'Charles',
  'Karen',
  'Emma',
  'Liam',
  'Olivia',
  'Noah',
  'Ava',
  'Sophia',
  'Mason',
  'Isabella',
  'Logan',
  'Mia',
];
const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Hernandez',
  'Lopez',
  'Wilson',
  'Anderson',
  'Thomas',
  'Taylor',
  'Moore',
  'Jackson',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'White',
  'Harris',
  'Sanchez',
  'Clark',
];
const STREETS = [
  'Main St',
  'Oak Ave',
  'Maple Dr',
  'Cedar Ln',
  'Pine Rd',
  'Elm St',
  'Park Ave',
  'Lake Dr',
  'Hill Rd',
  'River Way',
  'Forest Dr',
  'Sunset Blvd',
  'Ocean Ave',
  'Spring St',
  'Valley Rd',
];
const CITIES = [
  'Springfield',
  'Portland',
  'Austin',
  'Denver',
  'Seattle',
  'Boston',
  'Chicago',
  'Phoenix',
  'Nashville',
  'Atlanta',
  'Miami',
  'Dallas',
  'San Diego',
  'Minneapolis',
  'Charlotte',
];
const STATES = [
  'CA',
  'TX',
  'NY',
  'FL',
  'IL',
  'PA',
  'OH',
  'GA',
  'NC',
  'MI',
  'NJ',
  'VA',
  'WA',
  'AZ',
  'CO',
  'MA',
  'TN',
  'IN',
  'MO',
  'MD',
];
const DOMAINS = ['example.com', 'test.org', 'mail.com', 'inbox.net', 'demo.io'];

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)] ?? '';
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}
function genEmail(name: string) {
  const [f, l] = (name || genName()).toLowerCase().split(' ');
  return `${f}.${l}${randInt(1, 99)}@${pick(DOMAINS)}`;
}
function genPhone() {
  return `(${randInt(200, 999)}) ${randInt(200, 999)}-${String(randInt(1000, 9999))}`;
}
function genAddress() {
  return `${randInt(100, 9999)} ${pick(STREETS)}, ${pick(CITIES)}, ${pick(STATES)} ${String(
    randInt(10000, 99999)
  )}`;
}

export default function FakeDataDrawer({ activeTool, onResult, showAlert }: FakeDataDrawerProps) {
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState<FakeFormat>('text');
  const toolId = activeTool?.id || 'fake_data_set';

  interface FakeRecord { name: string; email: string; phone: string; address: string; }
  const handleGenerate = () => {
    const results: (string | FakeRecord)[] = [];
    for (let i = 0; i < count; i++) {
      const name = genName();
      switch (toolId) {
        case 'fake_name':
          results.push(name);
          break;
        case 'fake_email':
          results.push(genEmail(name));
          break;
        case 'fake_phone':
          results.push(genPhone());
          break;
        case 'fake_address':
          results.push(genAddress());
          break;
        case 'fake_data_set':
          results.push({ name, email: genEmail(name), phone: genPhone(), address: genAddress() });
          break;
        default:
          results.push(name);
      }
    }

    let output;
    if (toolId === 'fake_data_set') {
      if (format === 'json') {
        output = JSON.stringify(results, null, 2);
      } else if (format === 'csv') {
        output =
          'name,email,phone,address\n' +
          (results as FakeRecord[]).map((r) => `"${r.name}","${r.email}","${r.phone}","${r.address}"`).join('\n');
      } else {
        output = (results as FakeRecord[])
          .map((r, i) => `${i + 1}. ${r.name}\n   ${r.email}\n   ${r.phone}\n   ${r.address}`)
          .join('\n\n');
      }
    } else {
      output = results.join('\n');
    }

    onResult(activeTool?.label || 'Fake Data', output);
    showAlert(`Generated ${count} record(s)`, 'success');
  };

  const showFormat = toolId === 'fake_data_set';
  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field tu-fr-field--segmented">
          <span className="tu-fr-seg-label">Count</span>
          {[5, 10, 25, 50].map((n) => (
            <button
              key={n}
              className={`tu-fr-seg${count === n ? ' tu-fr-seg--on' : ''}`}
              onClick={() => setCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
        {!showFormat && (
          <div className="tu-fr-actions">
            <button
              className="tu-fr-action tu-fr-action--text"
              onClick={handleGenerate}
              title="Generate"
            >
              Generate
            </button>
          </div>
        )}
      </div>
      {showFormat && (
        <div className="tu-fr-row">
          <div className="tu-fr-field tu-fr-field--segmented">
            <span className="tu-fr-seg-label">Format</span>
            {(['text', 'json', 'csv'] as const).map((f) => (
              <button
                key={f}
                className={`tu-fr-seg${format === f ? ' tu-fr-seg--on' : ''}`}
                onClick={() => setFormat(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="tu-fr-actions">
            <button
              className="tu-fr-action tu-fr-action--text"
              onClick={handleGenerate}
              title="Generate"
            >
              Generate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
