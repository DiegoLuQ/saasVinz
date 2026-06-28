'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
    {
        q: "¿Cómo garantiza Vincer la trazabilidad y evita errores en las cenizas?",
        a: "Cada servicio genera un código de verificación único de 10 caracteres más un token de tracking público. El flujo de trabajo es configurable por crematorio y cada fase requiere evidencia fotográfica, notas y firma del operador. El sistema registra usuario, hora y cambios en cada acción crítica, dejando un historial de auditoría completo."
    },
    {
        q: "¿Qué es el Plan de Tracking público para la familia?",
        a: "Es un enlace único por servicio que la familia puede abrir sin iniciar sesión. Muestra una línea de tiempo con cada fase completada del proceso, foto de evidencia, descripción y hora exacta. La familia acompaña el servicio en tiempo real, lo que reduce las llamadas de seguimiento al crematorio."
    },
    {
        q: "¿Cómo funcionan los certificados de cremación?",
        a: "El sistema genera certificados PDF automáticos con los datos de la mascota, el dueño, el tipo de servicio, firma digital, marca de agua del crematorio y numeración secuencial por cuenta. Las plantillas son editables (secciones, colores, orden, tipografías). Disponible desde el plan PRO."
    },
    {
        q: "¿Cómo son los memoriales digitales?",
        a: "Cada servicio puede generar un memorial público interactivo, temas configurables (fondos, partículas, colores), galería de imágenes colaborativa, dedicatorias y velas virtuales. Las dedicatorias requieren aprobación del crematorio antes de publicarse y los memoriales privados pueden protegerse con un PIN de 6 dígitos."
    },
    {
        q: "¿Qué roles y permisos puedo asignar al equipo?",
        a: "El sistema cuenta con roles para admin, recepción, operador de cremación, contabilidad, marketing, auditor y conductor. Cada rol tiene permisos granulares por módulo y acción (ver, crear, editar, eliminar). El admin del crematorio puede activar o desactivar módulos según necesidad."
    },
    {
        q: "¿El software es multi-sede y aísla los datos de cada crematorio?",
        a: "Sí. Vincer está construido sobre una arquitectura multi-tenant nativa con aislamiento estricto: cada crematorio opera dentro de su propio espacio y no puede ver datos de otros. Los administradores globales tienen un panel separado para gestionar cuentas y planes."
    },
    {
        q: "¿Qué módulos incluye cada plan?",
        a: "FREE: dashboard, CRM (clientes/mascotas), catálogo (servicios/productos), órdenes e inventario. TRACK: foco en operaciones + órdenes + inventario (sin certificados ni configuración). NORMAL: añade certificados y operaciones. PRO: lo mismo que NORMAL más exportación de datos. ULTRA: todo lo anterior con mayores cupos de mascotas y usuarios."
    },
    {
        q: "¿En qué se diferencia el plan Track del Normal?",
        a: "Track ($29.900/mes) es un plan especializado en operaciones y trazabilidad para crematorios que ya tienen su CRM/facturación externa. Incluye operaciones, órdenes, cobros online e inventario, pero no certificados ni el módulo de configuración. Normal ($39.900/mes) es la versión completa con certificados y mayor flexibilidad operativa."
    }
];

export function VincerFaqs() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <section id="faqs" className="py-24 px-6 max-w-4xl mx-auto relative z-10">
            <div className="text-center mb-16 space-y-4">
                <h2 className="text-3xl md:text-5xl font-black text-[#FFFFFF]">
                    Preguntas Frecuentes
                </h2>
                <p className="text-slate-400 font-medium">
                    Todo lo que necesitas saber sobre la implementación, seguridad y funcionamiento de Vincer.
                </p>
            </div>

            <div className="space-y-4">
                {faqs.map((faq, i) => (
                    <div
                        key={i}
                        className="bg-[#0b0a24]/40 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300"
                    >
                        <button
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                        >
                            <span className="font-bold text-sm sm:text-base text-[#FFFFFF]">{faq.q}</span>
                            <ChevronDown
                                size={18}
                                className={`text-[#19B5FE] transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`}
                            />
                        </button>

                        <AnimatePresence initial={false}>
                            {openFaq === i && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="px-6 pb-5 text-xs sm:text-sm text-slate-400 border-t border-white/5 pt-4 leading-relaxed">
                                        {faq.a}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </section>
    );
}
