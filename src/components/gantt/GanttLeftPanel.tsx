'use client';
import React, { useRef } from 'react';
import { format } from 'date-fns';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { GanttRow, ColKey, ROW_HEIGHT } from './gantt-types';

interface Props {
  rows: GanttRow[];
  selectedIds: Set<string>;
  editingCell: { rowId: string; field: string } | null;
  colWidths: Record<ColKey, number>;
  onSelect: (id: string, e: React.MouseEvent, index: number) => void;
  onDoubleClick: (rowId: string, field: string) => void;
  onCellBlur: (rowId: string, field: string, value: string) => void;
  onToggleExpand: (id: string) => void;
  onColResize: (e: React.MouseEvent, col: ColKey) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

// Shared resize handle — 6px hit zone centered on column border
function ResizeHandle({ col, onResize }: { col: ColKey; onResize: (e: React.MouseEvent, c: ColKey) => void }) {
  return (
    <div
      className="absolute top-0 h-full z-20 cursor-col-resize"
      style={{ right: -3, width: 6 }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onResize(e, col); }}
    />
  );
}

// Inline edit input — auto-focuses and selects on mount
function CellInput({ value, width, type = 'text', onBlur }: {
  value: string; width: number; type?: string; onBlur: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  React.useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input
      ref={ref} type={type} defaultValue={value}
      style={{ width, minWidth: 0 }}
      className="h-5 bg-input border border-primary text-xs px-1 focus:outline-none focus:ring-1 focus:ring-primary rounded-none"
      onBlur={(e) => onBlur(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { (e.target as HTMLInputElement).defaultValue = value; (e.target as HTMLInputElement).blur(); } }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}

// Table cell — consistent border, resize handle, and double-click zone
function Cell({ width, col, onResize, onDblClick, children, center }: {
  width: number; col: ColKey;
  onResize: (e: React.MouseEvent, c: ColKey) => void;
  onDblClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  center?: boolean;
}) {
  return (
    <td
      style={{ width, minWidth: width, maxWidth: width, position: 'relative', borderRight: '1px solid hsl(var(--border))', overflow: 'hidden' }}
      className={`px-2 text-xs align-middle whitespace-nowrap ${center ? 'text-center' : ''}`}
      onDoubleClick={onDblClick}
    >
      {children}
      <ResizeHandle col={col} onResize={onResize} />
    </td>
  );
}

export function GanttLeftPanel({
  rows, selectedIds, editingCell, colWidths,
  onSelect, onDoubleClick, onCellBlur, onToggleExpand, onColResize,
  scrollRef, onScroll,
}: Props) {
  const totalWidth = Object.values(colWidths).reduce((s, w) => s + w, 0);
  const headerRef = useRef<HTMLDivElement>(null);

  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerRef.current) headerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    onScroll(e);
  };

  const isEditing = (rowId: string, field: string) =>
    editingCell?.rowId === rowId && editingCell?.field === field;

  // Resolve predecessor WBS from the stored ID
  const getPredWbs = (predecessorId?: string) =>
    predecessorId ? (rows.find(r => r.originalItem?.id === predecessorId)?.wbs ?? '') : '';

  // Header columns definition
  const headers: { label: string; col: ColKey; center?: boolean }[] = [
    { label: 'WBS', col: 'wbs', center: true },
    { label: 'Task Name', col: 'name' },
    { label: 'Pred.', col: 'predecessor', center: true },
    { label: 'Days', col: 'duration', center: true },
    { label: 'Start', col: 'start', center: true },
    { label: 'Finish', col: 'end', center: true },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: 'inherit' }}>
      {/* Fixed header — horizontally synced with body */}
      <div ref={headerRef} className="shrink-0 overflow-hidden bg-muted border-b-2 border-border" style={{ minWidth: 0 }}>
        <table style={{ width: totalWidth, tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="h-9">
              {headers.map(({ label, col, center }) => (
                <th
                  key={col}
                  style={{ width: colWidths[col], minWidth: colWidths[col], maxWidth: colWidths[col], position: 'relative', borderRight: '1px solid hsl(var(--border))', overflow: 'hidden' }}
                  className={`px-2 text-[11px] font-semibold text-foreground select-none whitespace-nowrap ${center ? 'text-center' : 'text-left'}`}
                >
                  {label}
                  <ResizeHandle col={col} onResize={onColResize} />
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable body */}
      <div
        ref={scrollRef}
        onScroll={handleBodyScroll}
        className="flex-1 overflow-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        <table style={{ width: totalWidth, tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <colgroup>
            {headers.map(({ col }) => (
              <col key={col} style={{ width: colWidths[col] }} />
            ))}
          </colgroup>
          <tbody>
            {rows.map((row, index) => {
              const isSelected = selectedIds.has(row.id);
              const isRelease = row.type === 'Release';
              const canExpand = row.childrenIds.length > 0;
              const indent = row.level * 16;
              const predWbs = getPredWbs(row.predecessorId);

              const rowBg = isSelected
                ? 'bg-primary/15'
                : index % 2 === 0 ? 'bg-background' : 'bg-muted/30';

              return (
                <tr
                  key={row.id}
                  style={{ height: ROW_HEIGHT }}
                  className={`${rowBg} border-b border-border cursor-pointer hover:bg-primary/5 select-none ${isSelected ? 'outline outline-1 outline-primary/50' : ''}`}
                  onClick={(e) => onSelect(row.id, e, index)}
                >
                  {/* WBS */}
                  <Cell width={colWidths.wbs} col="wbs" onResize={onColResize} center>
                    <span className="text-muted-foreground">{row.wbs}</span>
                  </Cell>

                  {/* Task Name */}
                  <Cell
                    width={colWidths.name} col="name" onResize={onColResize}
                    onDblClick={(e) => { e.stopPropagation(); onDoubleClick(row.id, 'name'); }}
                  >
                    <div className="flex items-center" style={{ paddingLeft: indent }}>
                      {canExpand ? (
                        <button
                          className="shrink-0 w-4 h-4 flex items-center justify-center mr-1 hover:bg-muted rounded"
                          onClick={(e) => { e.stopPropagation(); onToggleExpand(row.id); }}
                        >
                          {row.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      ) : <div className="w-4 h-4 shrink-0 mr-1" />}
                      {isEditing(row.id, 'name') ? (
                        <CellInput
                          value={row.title}
                          width={colWidths.name - indent - 28}
                          onBlur={(v) => onCellBlur(row.id, 'title', v)}
                        />
                      ) : (
                        <span className={`truncate ${isRelease ? 'font-bold' : ''} ${!row.startDate && !isRelease ? 'text-destructive' : ''}`}>
                          {row.title}
                        </span>
                      )}
                    </div>
                  </Cell>

                  {/* Predecessor — shows WBS of predecessor, editable by typing WBS */}
                  <Cell
                    width={colWidths.predecessor} col="predecessor" onResize={onColResize} center
                    onDblClick={(e) => { e.stopPropagation(); if (!isRelease) onDoubleClick(row.id, 'predecessor'); }}
                  >
                    {isEditing(row.id, 'predecessor') && !isRelease ? (
                      <CellInput
                        value={predWbs}
                        width={colWidths.predecessor - 8}
                        onBlur={(v) => onCellBlur(row.id, 'predecessorWbs', v)}
                      />
                    ) : (
                      <span className="text-muted-foreground">{predWbs}</span>
                    )}
                  </Cell>

                  {/* Duration */}
                  <Cell
                    width={colWidths.duration} col="duration" onResize={onColResize} center
                    onDblClick={(e) => { e.stopPropagation(); if (!isRelease) onDoubleClick(row.id, 'duration'); }}
                  >
                    {isEditing(row.id, 'duration') && !isRelease ? (
                      <CellInput
                        value={row.duration?.toString() ?? ''}
                        width={colWidths.duration - 8}
                        type="number"
                        onBlur={(v) => onCellBlur(row.id, 'effortDays', v)}
                      />
                    ) : (
                      <span className="text-muted-foreground">{row.duration != null ? `${row.duration}d` : ''}</span>
                    )}
                  </Cell>

                  {/* Start */}
                  <Cell
                    width={colWidths.start} col="start" onResize={onColResize} center
                    onDblClick={(e) => { e.stopPropagation(); if (!isRelease) onDoubleClick(row.id, 'start'); }}
                  >
                    {isEditing(row.id, 'start') && !isRelease ? (
                      <CellInput
                        value={row.startDate ? format(row.startDate, 'yyyy-MM-dd') : ''}
                        width={colWidths.start - 8}
                        type="date"
                        onBlur={(v) => onCellBlur(row.id, 'startDate', v ? new Date(v).toISOString() : '')}
                      />
                    ) : (
                      <span className="text-muted-foreground">{row.startDate ? format(row.startDate, 'dd/MM/yy') : ''}</span>
                    )}
                  </Cell>

                  {/* End */}
                  <Cell
                    width={colWidths.end} col="end" onResize={onColResize} center
                    onDblClick={(e) => { e.stopPropagation(); if (!isRelease) onDoubleClick(row.id, 'end'); }}
                  >
                    {isEditing(row.id, 'end') && !isRelease ? (
                      <CellInput
                        value={row.endDate ? format(row.endDate, 'yyyy-MM-dd') : ''}
                        width={colWidths.end - 8}
                        type="date"
                        onBlur={(v) => onCellBlur(row.id, 'endDate', v ? new Date(v).toISOString() : '')}
                      />
                    ) : (
                      <span className="text-muted-foreground">{row.endDate ? format(row.endDate, 'dd/MM/yy') : ''}</span>
                    )}
                  </Cell>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
