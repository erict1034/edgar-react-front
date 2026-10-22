// src/components/DraggableHeader.jsx
import { flexRender } from '@tanstack/react-table'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const ARIA_SORT = { asc: 'ascending', desc: 'descending' }

export default function DraggableHeader({ header, defaultAlign = 'left', tooltip }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: header.column.id })

    const sorted = header.column.getIsSorted()

    // A column def's `meta.align` wins. Otherwise use the caller's default:
    // left for existing callers (e.g. the App.jsx browser table), right when
    // DataGrid passes defaultAlign="right" to match its cells.
    const align = header.column.columnDef.meta?.align ?? defaultAlign

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        textAlign: align,
        padding: '6px 8px',
        borderBottom: '1px solid var(--table-border)',
        width: header.getSize(),
        position: 'relative',
        userSelect: 'none',
        background: 'var(--table-header-bg)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    }

    return (
        <th
            ref={setNodeRef}
            style={style}
            title={tooltip || undefined}
            aria-sort={ARIA_SORT[sorted] ?? (header.column.getCanSort() ? 'none' : undefined)}
        >
            {/* dnd-kit's attributes (role="button", tabIndex, aria-*) belong on
                the drag handle, not the <th>, so the header stays a columnheader. */}
            <span
                {...attributes}
                {...listeners}
                style={{ cursor: 'grab', marginRight: 4 }}
            >
                ⠿
            </span>
            <span
                onClick={header.column.getToggleSortingHandler()}
                style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
            >
                {flexRender(header.column.columnDef.header, header.getContext())}
                {{ asc: ' ▲', desc: ' ▼' }[sorted] ?? ''}
            </span>
            <div
                onMouseDown={header.getResizeHandler()}
                onTouchStart={header.getResizeHandler()}
                onDoubleClick={() => header.column.resetSize()}
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    height: '100%',
                    width: 5,
                    cursor: 'col-resize',
                    userSelect: 'none',
                    touchAction: 'none',
                    background: header.column.getIsResizing()
                        ? 'var(--table-resize-active)'
                        : 'transparent',
                }}
            />
        </th>
    )
}