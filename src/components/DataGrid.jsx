// src/components/DataGrid.jsx

import { useState, useMemo, useEffect, useRef } from 'react'

import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
} from '@tanstack/react-table'

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'

import {
    SortableContext,
    horizontalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable'

import Button from './Button'
import DraggableHeader from './DraggableHeader'
import ColumnVisibilityMenu from './ColumnVisibilityMenu'
import useClickOutside from '../hooks/useClickOutside'



function loadState(key, fallback) {
    try {
        const value = localStorage.getItem(key)
        return value ? JSON.parse(value) : fallback
    } catch {
        return fallback
    }
}

function saveState(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {
        // ignore
    }
}

// Saved order may reference columns that no longer exist, and may be missing
// columns added since it was saved. Drop the former, append the latter.
function reconcileOrder(saved, current) {
    if (!Array.isArray(saved)) return current
    const valid = saved.filter(id => current.includes(id))
    const added = current.filter(id => !valid.includes(id))
    return [...valid, ...added]
}

function sameOrder(a, b) {
    return a.length === b.length && a.every((id, i) => id === b[i])
}

// Column defs can set `meta: { align: 'left' }` to override the right-aligned
// default (use it for text columns like Period End / Term / Year).
function alignOf(column) {
    return column.columnDef.meta?.align ?? 'right'
}

export default function DataGrid({
    tableId,
    data,
    columns,
    emptyLabel = 'No data',
    headerTooltips,
    maxHeight = 320,
    defaultVisibility = {},
    scrollToBottom = false,
}) {
    const key = suffix => `grid:${tableId}:${suffix}`

    const initialColumnOrder = useMemo(
        () => columns.map(col => col.id ?? col.accessorKey).filter(Boolean),
        [columns]
    )

    const [sortingState, setSorting] = useState(() => {
        const saved = loadState(key('sorting'), [])
        return Array.isArray(saved)
            ? saved.filter(sort => sort && initialColumnOrder.includes(sort.id))
            : []
    })
    const sorting = useMemo(
        () => sortingState.filter(sort => initialColumnOrder.includes(sort.id)),
        [sortingState, initialColumnOrder]
    )
    useEffect(() => {
        if (sorting.length !== sortingState.length) setSorting(sorting)
    }, [sorting, sortingState.length])
    useEffect(() => {
        saveState(key('sorting'), sorting)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableId, sorting])

    const [columnVisibility, setColumnVisibility] = useState(() => ({
        ...defaultVisibility,
        ...loadState(key('visibility'), {}),
    }))
    useEffect(() => {
        saveState(key('visibility'), columnVisibility)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableId, columnVisibility])

    const [columnSizing, setColumnSizing] = useState(() =>
        loadState(key('sizing'), {})
    )
    // Debounced: 'onChange' resize mode updates on every mouse move.
    useEffect(() => {
        const t = setTimeout(() => saveState(key('sizing'), columnSizing), 300)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableId, columnSizing])

    const [columnMenuOpen, setColumnMenuOpen] = useState(false)

    const [columnOrder, setColumnOrder] = useState(() =>
        reconcileOrder(loadState(key('order'), initialColumnOrder), initialColumnOrder)
    )

    // If the column set changes at runtime (new column added, HMR), reconcile.
    useEffect(() => {
        setColumnOrder(current => {
            const next = reconcileOrder(current, initialColumnOrder)
            return sameOrder(next, current) ? current : next
        })
    }, [initialColumnOrder])

    useEffect(() => {
        saveState(key('order'), columnOrder)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableId, columnOrder])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    )

    const table = useReactTable({
        data,
        columns,
        state: { sorting, columnVisibility, columnOrder, columnSizing },
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: setColumnOrder,
        onColumnSizingChange: setColumnSizing,
        defaultColumn: { size: 82, minSize: 20 },
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    function handleDragEnd(event) {
        const { active, over } = event
        if (!active || !over || active.id === over.id) return

        setColumnOrder(current => {
            const oldIndex = current.indexOf(active.id)
            const newIndex = current.indexOf(over.id)
            if (oldIndex === -1 || newIndex === -1) return current
            return arrayMove(current, oldIndex, newIndex)
        })
    }

    async function copyPage() {
        try {
            const lines = []

            lines.push(
                table
                    .getVisibleLeafColumns()
                    .map(c =>
                        typeof c.columnDef.header === 'string'
                            ? c.columnDef.header
                            : c.id
                    )
                    .join('\t')
            )

            table.getRowModel().rows.forEach(row => {
                lines.push(
                    row
                        .getVisibleCells()
                        .map(cell => String(cell.getValue() ?? ''))
                        .join('\t')
                )
            })

            await navigator.clipboard.writeText(lines.join('\n'))
        } catch (err) {
            console.error('Failed to copy table', err)
        }
    }

    function resetLayout() {
        localStorage.removeItem(key('visibility'))
        localStorage.removeItem(key('order'))
        localStorage.removeItem(key('sizing'))

        setColumnVisibility(defaultVisibility)
        setColumnSizing({})
        setColumnOrder(initialColumnOrder)
    }

    const menuRef = useClickOutside(() => setColumnMenuOpen(false))

    const scrollRef = useRef(null)

    useEffect(() => {
        if (!scrollToBottom) return
        if (!scrollRef.current) return
        if (!data?.length) return

        const el = scrollRef.current

        // wait until browser has painted the rows
        requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight
        })
    }, [scrollToBottom, data])

    if (!data?.length) {
        return (
            <div
                style={{
                    fontSize: 12,
                    color: 'var(--menu-text-muted)',
                    padding: 12,
                }}
            >
                {emptyLabel}
            </div>
        )
    }

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    marginBottom: 8,
                }}
            >
                <div ref={menuRef} style={{ position: 'relative' }}>
                    <Button
                        variant="secondary"
                        isActive={columnMenuOpen}
                        onClick={() => setColumnMenuOpen(v => !v)}
                    >
                        Columns
                    </Button>

                    {columnMenuOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 20,
                                minWidth: 180,
                                padding: 8,
                                background: 'var(--menu-bg)',
                                border: '1px solid var(--menu-border)',
                                borderRadius: 4,
                            }}
                        >
                            <ColumnVisibilityMenu table={table} />
                        </div>
                    )}
                </div>

                <Button variant="secondary" onClick={copyPage}>
                    Copy Page
                </Button>
                <Button variant="secondary" onClick={resetLayout}>
                    Reset Layout
                </Button>
            </div>

            <div
                ref={scrollRef}
                style={{
                    maxHeight,
                    overflowX: 'auto',
                    overflowY: 'auto',
                    border: '1px solid var(--table-border)',
                }}
            >
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <table
                        style={{
                            width: table.getTotalSize(),
                            borderCollapse: 'collapse',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            tableLayout: 'fixed',
                        }}
                    >
                        <thead
                            style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 2,
                                background: 'var(--table-header-bg)',
                            }}
                        >
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    <SortableContext
                                        items={headerGroup.headers.map(h => h.column.id)}
                                        strategy={horizontalListSortingStrategy}
                                    >
                                        {headerGroup.headers.map(header => (
                                            <DraggableHeader
                                                key={header.id}
                                                header={header}
                                                defaultAlign="right"
                                                tooltip={headerTooltips?.[header.column.id]}
                                            />
                                        ))}
                                    </SortableContext>
                                </tr>
                            ))}
                        </thead>

                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <td
                                            key={cell.id}
                                            title={String(cell.getValue() ?? '')}
                                            style={{
                                                textAlign: alignOf(cell.column),
                                                padding: '4px 8px',
                                                width: cell.column.getSize(),
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DndContext>
            </div>
        </>
    )
}