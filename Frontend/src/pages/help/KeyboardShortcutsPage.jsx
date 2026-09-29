// src/pages/help/KeyboardShortcutsPage.jsx
import React from 'react';

const SHORTCUTS = [
  ['J', 'Next document'], 
  ['K', 'Previous document'], 
  ['S', 'Save draft'],
  ['A', 'Approve'], 
  ['F', 'Flag for exception'], 
  ['+ / −', 'Zoom in / out'],
  ['R', 'Rotate document'], 
  ['?', 'Show this key map'], 
  ['Esc', 'Close dialog']
];

const KeyboardShortcutsPage = () => {
  return (
    <section className="flex-1 min-h-0 overflow-auto p-5 pb-10 block" aria-labelledby="h-shortcuts">
      <div className="flex items-start gap-4 mb-4 flex-wrap">
        <div className="min-w-[220px]">
          <h1 id="h-shortcuts" className="text-[20px] font-semibold leading-tight m-0">Keyboard Shortcuts</h1>
          <p className="text-[#5a6472] text-[12.5px] mt-[3px] max-w-[74ch]">
            Active on Pending Review, Correction and Flagged. Ignored while focus is inside a text field; none conflict with standard browser or screen-reader keys.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#d7dbe2] rounded-[10px] shadow-[0_1px_2px_rgba(16,24,40,.06),0_1px_3px_rgba(16,24,40,.1)] overflow-hidden max-w-3xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <caption className="sr-only">Keyboard Shortcuts Map</caption>
            <thead>
              <tr>
                <th scope="col" className="text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold bg-[#fafbfc] px-3 py-[9px] text-left border-b border-[#d7dbe2]">Key</th>
                <th scope="col" className="text-[11px] uppercase tracking-[.05em] text-[#5a6472] font-bold bg-[#fafbfc] px-3 py-[9px] text-left border-b border-[#d7dbe2]">Action</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map(([key, action], idx) => (
                <tr key={idx} className="hover:bg-[#f8fafc]">
                  <td className="px-3 py-[9px] border-b border-[#d7dbe2] align-middle">
                    <kbd className="font-mono text-[11px] bg-[#eef0f3] border border-[#b9c0cb] border-b-[2px] rounded inline-block px-[5px] py-[1px]">
                      {key}
                    </kbd>
                  </td>
                  <td className="px-3 py-[9px] border-b border-[#d7dbe2] align-middle">
                    {action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default KeyboardShortcutsPage;