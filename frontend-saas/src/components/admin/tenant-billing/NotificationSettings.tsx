import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mail, Smartphone, LayoutDashboard } from 'lucide-react';
import Switch from './Switch';
import type { BillingChannels } from './types';

interface NotificationSettingsProps {
    notifyDays: number;
    channels: BillingChannels;
    onNotifyDaysChange: (value: number) => void;
    onChannelsChange: (channels: BillingChannels) => void;
}

export default function NotificationSettings({
    notifyDays,
    channels,
    onNotifyDaysChange,
    onChannelsChange
}: NotificationSettingsProps) {
    const setChannel = (key: keyof BillingChannels, value: boolean) => {
        onChannelsChange({ ...channels, [key]: value });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0a192f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
        >
            <div className="p-6 border-b border-white/10">
                <h2 className="text-lg font-black text-white flex items-center gap-3">
                    <MessageSquare size={20} className="text-purple-400" />
                    Notificaciones
                </h2>
            </div>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-sm font-medium text-white">Avisar antes de vencer</span>
                    <div className="flex items-center gap-2 bg-[#0f2642] px-3 py-1 rounded-lg border border-white/10">
                        <input
                            type="number"
                            min={1}
                            max={60}
                            value={notifyDays}
                            onChange={(e) => onNotifyDaysChange(parseInt(e.target.value) || 0)}
                            className="w-12 bg-transparent text-center text-white font-bold outline-none"
                        />
                        <span className="text-[10px] text-white/40 uppercase font-bold">Días</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] uppercase font-black text-white/30 block tracking-[0.15em]">
                        Canales de Envío
                    </label>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors">
                        <Mail size={18} className={channels.email ? 'text-primary' : 'text-white/40'} />
                        <span className="text-sm text-white flex-1">Email Corporativo</span>
                        <Switch
                            checked={channels.email}
                            onChange={(v) => setChannel('email', v)}
                            accent="primary"
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors">
                        <Smartphone size={18} className={channels.whatsapp ? 'text-green-400' : 'text-white/40'} />
                        <span className="text-sm text-white flex-1">WhatsApp</span>
                        <Switch
                            checked={channels.whatsapp}
                            onChange={(v) => setChannel('whatsapp', v)}
                            accent="green"
                        />
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors">
                        <LayoutDashboard size={18} className={channels.dashboard ? 'text-blue-400' : 'text-white/40'} />
                        <span className="text-sm text-white flex-1">Notificación Dashboard</span>
                        <Switch
                            checked={channels.dashboard}
                            onChange={(v) => setChannel('dashboard', v)}
                            accent="blue"
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
