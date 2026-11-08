"use client";

import SubmissionsTable from '@/components/tenant/SubmissionsTable';

/** Registros del formulario web: pendientes y papelera («Eliminados», restaurar / borrar definitivo). */
export default function RegistrosPage() {
    return (
        <div className="max-w-5xl mx-auto">
            <SubmissionsTable />
        </div>
    );
}
