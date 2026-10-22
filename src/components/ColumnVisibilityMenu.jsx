// ColumnVisibilityMenu.jsx

export default function ColumnVisibilityMenu({ table }) {
    return (
        <>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                <input
                    type="checkbox"
                    checked={table.getIsAllColumnsVisible()}
                    onChange={table.getToggleAllColumnsVisibilityHandler()}
                />
                {' '}Toggle All
            </label>
            {table.getAllLeafColumns().map(column => (
                <label key={column.id} style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
                    <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                    />
                    {' '}{column.columnDef.header}
                </label>
            ))}
        </>
    )
}