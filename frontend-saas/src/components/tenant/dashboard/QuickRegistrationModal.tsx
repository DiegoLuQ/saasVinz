"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    UserCircle,
    Dog,
    Layers,
    MapPin,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Plus,
    Check,
    Copy,
    ExternalLink,
    Loader2,
    Search,
    Phone,
    Mail,
    Sparkles,
    Package,
    Truck,
    Camera,
    Trash2,
} from 'lucide-react';
import { apiRequest } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import { regions } from '@/lib/tenant/chile-data';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import ImageCropper from '@/components/tenant/ImageCropper';

interface QuickRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function QuickRegistrationModal({ isOpen, onClose, onSuccess }: QuickRegistrationModalProps) {
    const { showToast } = useToast();

    // Wizard Step State: 1: Cliente, 2: Mascota, 3: Plan/Servicios, 4: Logística, 5: Resultado
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

    // Data catalogs
    const [loadingCatalogs, setLoadingCatalogs] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [pets, setPets] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

    // Form selection & creation states
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
    const [createNewCustomer, setCreateNewCustomer] = useState(true);
    const [customerSearchQuery, setCustomerSearchQuery] = useState('');
    const [newCustomer, setNewCustomer] = useState({
        full_name: '',
        rut: '',
        email: '',
        phone: '',
    });

    const getCustomerDisplayName = (c: any) => {
        if (c.name) return c.name;
        const fn = (c.first_name || '').trim();
        const ln = (c.last_name || '').trim();
        if (fn || ln) return `${fn} ${ln}`.trim();
        return 'Sin nombre';
    };

    const filteredCustomers = customers.filter(c => {
        if (!customerSearchQuery.trim()) return true;
        const q = customerSearchQuery.toLowerCase();
        const fullName = getCustomerDisplayName(c).toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const rut = (c.rut || '').toLowerCase();
        return fullName.includes(q) || phone.includes(q) || rut.includes(q);
    });

    // Step 2: Pet
    const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
    const [createNewPet, setCreateNewPet] = useState(true);
    const [newPet, setNewPet] = useState({
        name: '',
        species: 'Perro',
        breed: '',
        weight: '',
        birth_date: '',
        death_date: '',
        notes: '',
    });

    // Step 3: Plan & Additional Products
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [discount, setDiscount] = useState<number>(0);

    // Step 4: Logistics & Photos
    const [pickupType, setPickupType] = useState<'domicilio' | 'veterinaria'>('domicilio');
    const [pickupRegion, setPickupRegion] = useState('');
    const [pickupCity, setPickupCity] = useState('');
    const [pickupAddress, setPickupAddress] = useState('');
    const [sameAsPickup, setSameAsPickup] = useState(true);
    const [showDeliveryFields, setShowDeliveryFields] = useState(false);
    const [deliveryRegion, setDeliveryRegion] = useState('');
    const [deliveryCity, setDeliveryCity] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [notes, setNotes] = useState('');

    // Photo evidence (hasta 3 fotos recortadas en WebP)
    const [photos, setPhotos] = useState<Blob[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const [showCropper, setShowCropper] = useState(false);
    const [cropSource, setCropSource] = useState<string | null>(null);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        if (photos.length >= 3) {
            showToast('Máximo 3 fotos de evidencia', 'error');
            return;
        }
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            setCropSource(reader.result as string);
            setShowCropper(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        setShowCropper(false);
        setCropSource(null);

        if (photos.length >= 3) return;

        setPhotos(prev => [...prev, croppedBlob]);
        const previewUrl = URL.createObjectURL(croppedBlob);
        setPhotoPreviews(prev => [...prev, previewUrl]);
        showToast('Foto optimizada y recortada correctamente (WebP 1:1)', 'success');
    };

    const handleRemovePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPhotoPreviews(prev => {
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    // Step 5: Creation result
    const [isSaving, setIsSaving] = useState(false);
    const [createdResult, setCreatedResult] = useState<{
        id: number;
        verification_code: string;
        pet_name?: string;
        customer_name?: string;
    } | null>(null);
    const [copiedTracking, setCopiedTracking] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Auto-save draft in localStorage
    const LOCAL_STORAGE_KEY = 'quick_registration_modal_draft';

    useEffect(() => {
        if (isOpen && typeof window !== 'undefined') {
            try {
                const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
                if (savedDraft) {
                    const parsed = JSON.parse(savedDraft);
                    if (parsed && typeof parsed === 'object') {
                        if (parsed.newCustomer) setNewCustomer(parsed.newCustomer);
                        if (parsed.newPet) setNewPet(parsed.newPet);
                        if (parsed.selectedCustomerId) setSelectedCustomerId(parsed.selectedCustomerId);
                        if (parsed.createNewCustomer !== undefined) setCreateNewCustomer(parsed.createNewCustomer);
                        if (parsed.selectedPetId) setSelectedPetId(parsed.selectedPetId);
                        if (parsed.createNewPet !== undefined) setCreateNewPet(parsed.createNewPet);
                        if (parsed.selectedPlanId) setSelectedPlanId(parsed.selectedPlanId);
                        if (parsed.selectedProductId) setSelectedProductId(parsed.selectedProductId);
                        if (parsed.pickupType) setPickupType(parsed.pickupType);
                        if (parsed.pickupRegion) setPickupRegion(parsed.pickupRegion);
                        if (parsed.pickupCity) setPickupCity(parsed.pickupCity);
                        if (parsed.pickupAddress) setPickupAddress(parsed.pickupAddress);
                        if (parsed.deliveryAddress) setDeliveryAddress(parsed.deliveryAddress);
                        if (parsed.notes) setNotes(parsed.notes);
                        if (parsed.step && parsed.step < 5) setStep(parsed.step);
                    }
                }
            } catch (e) {
                console.warn('Error leyendo borrador local:', e);
            }
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && step < 5 && typeof window !== 'undefined') {
            try {
                const draft = {
                    newCustomer,
                    newPet,
                    selectedCustomerId,
                    createNewCustomer,
                    selectedPetId,
                    createNewPet,
                    selectedPlanId,
                    selectedProductId,
                    pickupType,
                    pickupRegion,
                    pickupCity,
                    pickupAddress,
                    deliveryAddress,
                    notes,
                    step,
                };
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draft));
            } catch (e) {
                console.warn('Error guardando borrador local:', e);
            }
        }
    }, [
        isOpen,
        step,
        newCustomer,
        newPet,
        selectedCustomerId,
        createNewCustomer,
        selectedPetId,
        createNewPet,
        selectedPlanId,
        selectedProductId,
        pickupType,
        pickupRegion,
        pickupCity,
        pickupAddress,
        deliveryAddress,
        notes,
    ]);

    const clearLocalDraft = () => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            } catch (e) {}
        }
    };

    // Fetch initial catalogs when opened
    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        setLoadingCatalogs(true);
        try {
            const results = await Promise.allSettled([
                apiRequest('/api/internal/customers/'),
                apiRequest('/api/internal/plans/'),
                apiRequest('/api/internal/services/'),
                apiRequest('/api/internal/products/'),
            ]);

            const settled = (i: number): any[] => {
                if (results[i].status === 'fulfilled') {
                    const val = (results[i] as PromiseFulfilledResult<any>).value;
                    return Array.isArray(val) ? val : val?.items || [];
                }
                return [];
            };

            setCustomers(settled(0));
            setPlans(settled(1));
            setProducts(settled(3));

            if (settled(1).length > 0 && !selectedPlanId) {
                setSelectedPlanId(settled(1)[0].id);
            }
        } catch (err) {
            console.error('Error cargando catálogos:', err);
            showToast('Error cargando datos para el formulario', 'error');
        } finally {
            setLoadingCatalogs(false);
        }
    };

    useEffect(() => {
        if (selectedCustomerId && !createNewPet) {
            fetchPetsForCustomer(selectedCustomerId);
        }
    }, [selectedCustomerId, createNewPet]);

    const fetchPetsForCustomer = async (cid: number) => {
        try {
            const data = await apiRequest(`/api/internal/pets/?customer_id=${cid}`);
            const list = Array.isArray(data) ? data : data?.items || [];
            setPets(list);
            if (list.length > 0) {
                setSelectedPetId(list[0].id);
            } else {
                setSelectedPetId(null);
                setCreateNewPet(true);
            }
        } catch (err) {
            console.error('Error cargando mascotas:', err);
        }
    };

    const selectedCustomerObj = customers.find(c => c.id === selectedCustomerId);

    const handleNext = () => {
        if (step === 1) {
            if (createNewCustomer) {
                if (!newCustomer.full_name.trim() || !newCustomer.phone.trim()) {
                    showToast('Ingresa al menos el nombre completo y teléfono del cliente', 'error');
                    return;
                }
            } else if (!selectedCustomerId) {
                showToast('Selecciona un cliente o registra uno nuevo', 'error');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (createNewPet) {
                if (!newPet.name.trim()) {
                    showToast('Ingresa el nombre de la mascota', 'error');
                    return;
                }
            } else if (!selectedPetId) {
                showToast('Selecciona una mascota o registra una nueva', 'error');
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (!selectedPlanId) {
                showToast('Selecciona un plan para la cremación', 'error');
                return;
            }
            setStep(4);
        } else if (step === 4) {
            handleSubmitFinalOrder();
        }
    };

    const handleSubmitFinalOrder = async () => {
        setIsSaving(true);
        try {
            let finalCustomerId = selectedCustomerId;
            let finalCustomerName = 'Cliente';

            if (createNewCustomer) {
                if (!newCustomer.full_name.trim() || !newCustomer.phone.trim()) {
                    showToast('Ingresa al menos el nombre completo y teléfono del cliente', 'error');
                    setIsSaving(false);
                    return;
                }
                const custRes = await apiRequest('/api/internal/customers/', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: newCustomer.full_name.trim(),
                        phone: newCustomer.phone.trim(),
                        rut: newCustomer.rut.trim() || null,
                        email: newCustomer.email.trim() || null,
                    }),
                });
                finalCustomerId = custRes.id;
                finalCustomerName = custRes.name;
                setCustomers(prev => [custRes, ...prev]);
            } else if (selectedCustomerObj) {
                finalCustomerName = getCustomerDisplayName(selectedCustomerObj);
            }

            if (!finalCustomerId) {
                showToast('Falta el cliente asociado', 'error');
                setIsSaving(false);
                return;
            }

            const existingPet = createNewPet ? null : pets.find(p => p.id === selectedPetId);
            const petNameForUpload = (createNewPet ? newPet.name.trim() : existingPet?.name) || '';

            if (!petNameForUpload) {
                showToast(
                    createNewPet ? 'Ingresa el nombre de la mascota' : 'Selecciona una mascota válida',
                    'error'
                );
                setIsSaving(false);
                return;
            }

            // Las fotos se suben ANTES de la mascota para poder persistirlas en su
            // ficha (`pets.images`): son fotos del animal, no sólo evidencia de la OC.
            // Se usa el endpoint de mascotas para que queden catalogadas como
            // "Imagen para {mascota}" en la Biblioteca de Medios.
            const uploadedImageUrls: string[] = [];
            let failedUploads = 0;
            for (let i = 0; i < photos.length; i++) {
                const formData = new FormData();
                formData.append('file', photos[i], `${petNameForUpload}_${i}.webp`);
                try {
                    const uploadRes = await apiRequest(
                        `/api/internal/pets/upload-image?pet_name=${encodeURIComponent(petNameForUpload)}&customer_id=${finalCustomerId}`,
                        {
                            method: 'POST',
                            body: formData,
                        }
                    );
                    if (uploadRes?.image_url) {
                        uploadedImageUrls.push(uploadRes.image_url);
                    } else {
                        failedUploads++;
                    }
                } catch (e) {
                    failedUploads++;
                    console.error('Error subiendo imagen:', e);
                }
            }
            if (failedUploads > 0) {
                showToast(
                    `No se pudieron subir ${failedUploads} de ${photos.length} fotos. La orden se guardará sin ellas.`,
                    'error'
                );
            }

            let finalPetId = selectedPetId;
            let finalPetName = petNameForUpload;

            if (createNewPet) {
                const petRes = await apiRequest('/api/internal/pets/', {
                    method: 'POST',
                    body: JSON.stringify({
                        customer_id: finalCustomerId,
                        name: newPet.name.trim(),
                        species: newPet.species,
                        breed: newPet.breed || 'Mestizo',
                        weight: newPet.weight ? parseFloat(newPet.weight) : null,
                        birth_date: newPet.birth_date ? new Date(newPet.birth_date).toISOString() : null,
                        death_date: newPet.death_date ? new Date(newPet.death_date).toISOString() : null,
                        notes: newPet.notes || '',
                        images: uploadedImageUrls,
                        image_url: uploadedImageUrls[0] || null,
                    }),
                });
                finalPetId = petRes.id;
                finalPetName = petRes.name;
                setPets(prev => [petRes, ...prev]);
            } else if (existingPet) {
                // Mascota existente: agregamos las fotos nuevas a las que ya tenía.
                if (uploadedImageUrls.length > 0) {
                    const mergedImages = Array.from(
                        new Set([...(existingPet.images || []), ...uploadedImageUrls])
                    );
                    try {
                        const updatedPet = await apiRequest(`/api/internal/pets/${existingPet.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({
                                images: mergedImages,
                                ...(existingPet.image_url ? {} : { image_url: uploadedImageUrls[0] }),
                            }),
                        });
                        setPets(prev => prev.map(p => (p.id === updatedPet.id ? updatedPet : p)));
                    } catch (e) {
                        console.error('Error asociando fotos a la mascota:', e);
                        showToast('Las fotos se subieron pero no se pudieron asociar a la ficha de la mascota', 'error');
                    }
                }
            }

            if (!finalPetId) {
                showToast('Falta seleccionar o ingresar la mascota', 'error');
                setIsSaving(false);
                return;
            }

            const chosenPlan = plans.find(p => p.id === selectedPlanId);
            const chosenProduct = products.find(p => p.id === selectedProductId);
            const weightVal = newPet.weight ? parseFloat(newPet.weight) : null;

            const finalDeliveryAddress = sameAsPickup 
                ? pickupAddress 
                : (deliveryAddress || pickupAddress);
            const finalDeliveryRegion = pickupRegion;
            const finalDeliveryCity = pickupCity;

            const payload = {
                pet_id: finalPetId,
                status: 'en_proceso',
                cremation_type: chosenPlan ? `Plan: ${chosenPlan.name}` : 'Estándar',
                scheduled_at: new Date().toISOString(),
                notes: notes || '',
                weight: weightVal,
                pickup_region: pickupRegion || null,
                pickup_city: pickupCity || null,
                pickup_address: pickupAddress || null,
                region: finalDeliveryRegion || null,
                city: finalDeliveryCity || null,
                address: finalDeliveryAddress || null,
                images: uploadedImageUrls,
                discount: discount || 0,
                planes: chosenPlan ? [{
                    plan_id: chosenPlan.id,
                    cantidad: 1,
                    unit_price: chosenPlan.price || 0,
                    precio_costo: chosenPlan.cost || 0,
                    es_principal: true,
                }] : [],
                products: chosenProduct ? [{
                    product_id: chosenProduct.id,
                    quantity: 1,
                    unit_price: chosenProduct.unit_price || chosenProduct.price || 0,
                    precio_costo: chosenProduct.cost_price || 0,
                }] : [],
                total_price: (chosenPlan?.price || 0) + (chosenProduct?.unit_price || 0) - (discount || 0),
            };

            const res = await apiRequest('/api/internal/cremations/', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            setCreatedResult({
                id: res.id,
                verification_code: res.verification_code || 'N/A',
                pet_name: finalPetName,
                customer_name: finalCustomerName,
            });

            clearLocalDraft();
            showToast('¡Orden Registrada con Éxito!', 'success');
            setStep(5);
            onSuccess?.();
        } catch (err: any) {
            console.error('Error creando servicio rápido:', err);
            showToast(err.message || 'Error al guardar la orden', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    };

    const copyTrackingCode = async () => {
        if (!createdResult?.verification_code) return;
        try {
            await copyToClipboard(createdResult.verification_code);
            setCopiedTracking(true);
            showToast('Código de seguimiento copiado', 'success');
            setTimeout(() => setCopiedTracking(false), 3000);
        } catch (err) {
            console.error('Error copiando código:', err);
            showToast('No se pudo copiar automáticamente', 'error');
        }
    };

    const copyTrackingLink = async () => {
        if (!createdResult?.verification_code) return;
        try {
            const baseUrl = window.location.origin;
            const fullUrl = `${baseUrl}/track?code=${createdResult.verification_code}`;
            await copyToClipboard(fullUrl);
            setCopiedLink(true);
            showToast('Enlace completo de seguimiento copiado', 'success');
            setTimeout(() => setCopiedLink(false), 3000);
        } catch (err) {
            console.error('Error copiando enlace:', err);
            showToast('No se pudo copiar el enlace', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="glass-card border border-foreground/10 bg-card rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between bg-foreground/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-foreground">Registro Rápido de Servicio</h2>
                            <p className="text-xs text-muted-foreground">Flujo guiado para iniciar el proceso y generar tracking</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Wizard Steps Indicator (1 to 4) */}
                {step < 5 && (
                    <div className="px-6 py-3 bg-foreground/2 border-b border-foreground/5 flex items-center justify-between gap-2 overflow-x-auto">
                        {[
                            { id: 1, label: 'Cliente', icon: UserCircle },
                            { id: 2, label: 'Mascota', icon: Dog },
                            { id: 3, label: 'Plan & Urna', icon: Layers },
                            { id: 4, label: 'Retiro & Entrega', icon: Truck },
                        ].map((s) => {
                            const Icon = s.icon;
                            const isActive = step === s.id;
                            const isCompleted = step > s.id;

                            return (
                                <div
                                    key={s.id}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                            : isCompleted
                                            ? 'bg-emerald-500/15 text-emerald-400'
                                            : 'text-muted-foreground/60 bg-foreground/5'
                                    }`}
                                >
                                    <Icon size={14} />
                                    <span>{s.id}. {s.label}</span>
                                    {isCompleted && <Check size={12} className="ml-1" />}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Step Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {loadingCatalogs ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                            <Loader2 className="animate-spin text-primary" size={32} />
                            <p className="text-xs font-medium">Cargando datos del sistema...</p>
                        </div>
                    ) : (
                        <>
                            {/* PASO 1: CLIENTE */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <UserCircle size={16} className="text-primary" /> Paso 1: Datos del Cliente
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setCreateNewCustomer(!createNewCustomer)}
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            {createNewCustomer ? '← Buscar existente' : '+ Registrar nuevo cliente'}
                                        </button>
                                    </div>

                                    {!createNewCustomer ? (
                                        <div className="space-y-3">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                                <input
                                                    type="text"
                                                    value={customerSearchQuery}
                                                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                                    placeholder="Buscar por Nombre o RUT..."
                                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>

                                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                                {filteredCustomers.length > 0 ? (
                                                    filteredCustomers.map((c) => {
                                                        const isSelected = selectedCustomerId === c.id;
                                                        return (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => setSelectedCustomerId(c.id)}
                                                                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                                                                    isSelected
                                                                        ? 'bg-primary/10 border-primary shadow-sm'
                                                                        : 'bg-background border-foreground/5 hover:border-foreground/20'
                                                                }`}
                                                            >
                                                                <div>
                                                                    <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                                                        <span>👤</span> {getCustomerDisplayName(c)}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        📞 {c.phone || 'Sin teléfono'} {c.rut ? `| RUT: ${c.rut}` : ''} {c.email ? `| ✉️ ${c.email}` : ''}
                                                                    </p>
                                                                </div>
                                                                {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="text-xs text-muted-foreground text-center py-4 italic">No se encontraron personas con ese criterio.</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-foreground/5 border border-foreground/5">
                                            <div className="sm:col-span-2">
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase">Nombre Completo *</label>
                                                <input
                                                    type="text"
                                                    value={newCustomer.full_name}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                                                    placeholder="Ej. María González Pérez"
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase">Teléfono *</label>
                                                <input
                                                    type="text"
                                                    value={newCustomer.phone}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                                                    placeholder="+56 9 1234 5678"
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase">RUT (Opcional)</label>
                                                <input
                                                    type="text"
                                                    value={newCustomer.rut}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, rut: e.target.value })}
                                                    placeholder="12.345.678-9"
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase">Correo Electrónico</label>
                                                <input
                                                    type="email"
                                                    value={newCustomer.email}
                                                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                                    placeholder="cliente@ejemplo.com"
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PASO 2: MASCOTA */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                            <Dog size={16} className="text-primary" /> Paso 2: Datos de la Mascota
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setCreateNewPet(!createNewPet)}
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            {createNewPet ? '← Seleccionar existente' : '+ Registrar nueva mascota'}
                                        </button>
                                    </div>

                                    {!createNewPet && pets.length > 0 ? (
                                        <div className="space-y-3">
                                            <label className="text-xs font-semibold text-muted-foreground block">
                                                Seleccionar Mascota de {selectedCustomerObj?.first_name}
                                            </label>
                                            <select
                                                value={selectedPetId || ''}
                                                onChange={(e) => setSelectedPetId(Number(e.target.value) || null)}
                                                className="w-full p-3 rounded-2xl bg-background border border-foreground/10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                {pets.map((p) => (
                                                    <option key={p.id} value={p.id}>
                                                        🐾 {p.name} ({p.species} - {p.breed || 'Mestizo'}) {p.weight ? `- ${p.weight} kg` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-foreground/5 border border-foreground/5">
                                            <div>
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase">Nombre Mascota *</label>
                                                <input
                                                    type="text"
                                                    value={newPet.name}
                                                    onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
                                                    placeholder="Ej. Rocky, Pelusa"
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase">Especie *</label>
                                                <select
                                                    value={newPet.species}
                                                    onChange={(e) => setNewPet({ ...newPet, species: e.target.value })}
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                >
                                                    <option value="Perro">🐶 Perro</option>
                                                    <option value="Gato">🐱 Gato</option>
                                                    <option value="Ave">🐦 Ave</option>
                                                    <option value="Roedor">🐹 Roedor</option>
                                                    <option value="Reptil">🦎 Reptil</option>
                                                    <option value="Insecto">🐞 Insecto</option>
                                                    <option value="Otros">🐾 Otros</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase">Raza</label>
                                                <input
                                                    type="text"
                                                    value={newPet.breed}
                                                    onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
                                                    placeholder="Ej. Quiltro, Poodle, Siames"
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                             <div>
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase">Fecha de Nacimiento (Opcional)</label>
                                                <input
                                                    type="date"
                                                    value={newPet.birth_date}
                                                    onChange={(e) => setNewPet({ ...newPet, birth_date: e.target.value })}
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted-foreground uppercase">Fecha de Fallecimiento (Opcional)</label>
                                                <input
                                                    type="date"
                                                    value={newPet.death_date}
                                                    onChange={(e) => setNewPet({ ...newPet, death_date: e.target.value })}
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Peso Aprox. (kg)</label>
                                                    {newPet.species === 'Perro' && newPet.weight && (
                                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                                            Rango: {
                                                                parseFloat(newPet.weight) <= 5 ? 'Pequeño (0-5 kg)' :
                                                                parseFloat(newPet.weight) <= 15 ? 'Mediano (5-15 kg)' :
                                                                parseFloat(newPet.weight) <= 25 ? 'Grande (15-25 kg)' :
                                                                parseFloat(newPet.weight) <= 40 ? 'Extra Grande (25-40 kg)' :
                                                                'Gigante (> 40 kg)'
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={newPet.weight}
                                                    onChange={(e) => setNewPet({ ...newPet, weight: e.target.value })}
                                                    placeholder="Ej. 12.5"
                                                    className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                                                />
                                                {newPet.species === 'Perro' && (
                                                    <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                                                        💡 El peso permite calcular automáticamente la tarifa y el tramo correspondiente de cremación.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PASO 3: PLAN & ADICIONALES */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Layers size={16} className="text-primary" /> Paso 3: Selección de Plan y Urna
                                    </h3>

                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold text-muted-foreground block">
                                            Plan Principales de Cremación *
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {plans.map((plan) => {
                                                const isSelected = selectedPlanId === plan.id;
                                                return (
                                                    <div
                                                        key={plan.id}
                                                        onClick={() => setSelectedPlanId(plan.id)}
                                                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                                            isSelected
                                                                ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                                                                : 'bg-background border-foreground/10 hover:border-foreground/20'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-bold text-sm text-foreground">{plan.name}</p>
                                                            {isSelected && <CheckCircle2 size={16} className="text-primary" />}
                                                        </div>
                                                        <p className="text-xs font-black text-emerald-400 mt-1">
                                                            ${(plan.price || 0).toLocaleString('es-CL')}
                                                        </p>
                                                        {plan.description && (
                                                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {products.length > 0 && (
                                        <div className="space-y-2 pt-2">
                                            <label className="text-xs font-semibold text-muted-foreground block">
                                                Urna / Recuerdo Adicional (Opcional)
                                            </label>
                                            <select
                                                value={selectedProductId || ''}
                                                onChange={(e) => setSelectedProductId(Number(e.target.value) || null)}
                                                className="w-full p-3 rounded-2xl bg-background border border-foreground/10 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="">-- Ninguno adicional --</option>
                                                {products.map((prod) => (
                                                    <option key={prod.id} value={prod.id}>
                                                        📦 {prod.name} - ${(prod.unit_price || prod.price || 0).toLocaleString('es-CL')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PASO 4: RETIRO, ENTREGA Y EVIDENCIA */}
                            {step === 4 && (
                                <div className="space-y-5">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Truck size={16} className="text-primary" /> Paso 4: Logística y Evidencia Fotográfica
                                    </h3>

                                    {/* SECCIÓN RETIRO */}
                                    <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                                <MapPin size={13} /> Dirección de Retiro
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="pickupType"
                                                        checked={pickupType === 'domicilio'}
                                                        onChange={() => setPickupType('domicilio')}
                                                        className="text-primary focus:ring-primary"
                                                    />
                                                    Domicilio
                                                </label>
                                                <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="pickupType"
                                                        checked={pickupType === 'veterinaria'}
                                                        onChange={() => setPickupType('veterinaria')}
                                                        className="text-primary focus:ring-primary"
                                                    />
                                                    Clínica
                                                </label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="text"
                                                    value={pickupAddress}
                                                    onChange={(e) => setPickupAddress(e.target.value)}
                                                    placeholder="Ej. Av. Providencia 1234, Dpto 402"
                                                    className="w-full p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Región</label>
                                                <div className="mt-1">
                                                    <SearchableSelect
                                                        options={regions.map(r => ({ value: r.label, label: r.label }))}
                                                        value={pickupRegion}
                                                        onChange={(val) => {
                                                            setPickupRegion(String(val));
                                                            setPickupCity('');
                                                        }}
                                                        placeholder="Selecciona Región..."
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Comuna *</label>
                                                <div className="mt-1">
                                                    <SearchableSelect
                                                        options={
                                                            regions.find(r => r.label === pickupRegion)?.communes.map(c => ({ value: c, label: c })) ||
                                                            regions.flatMap(r => r.communes).map(c => ({ value: c, label: c }))
                                                        }
                                                        value={pickupCity}
                                                        onChange={(val) => setPickupCity(String(val))}
                                                        placeholder={pickupRegion ? 'Selecciona Comuna...' : 'Buscar Comuna / Ciudad...'}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Checkbox igual a entrega */}
                                        <div className="pt-2 border-t border-foreground/5 flex items-center justify-between flex-wrap gap-2">
                                            <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={sameAsPickup}
                                                    onChange={(e) => {
                                                        const isSame = e.target.checked;
                                                        setSameAsPickup(isSame);
                                                        if (isSame) {
                                                            setShowDeliveryFields(false);
                                                        }
                                                    }}
                                                    className="rounded border-foreground/20 text-primary focus:ring-primary w-4 h-4"
                                                />
                                                <span>Dirección de entrega de cenizas igual a la de retiro</span>
                                            </label>

                                            {!sameAsPickup && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeliveryFields(!showDeliveryFields)}
                                                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                                >
                                                    {showDeliveryFields ? '▲ Ocultar entrega de cenizas' : '▼ Editar dirección de entrega'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Campos de entrega de cenizas (si no es igual a retiro) */}
                                        {(!sameAsPickup || showDeliveryFields) && (
                                            <div className="pt-3 border-t border-foreground/10 space-y-3 animate-in fade-in duration-300">
                                                <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    <MapPin size={13} /> Dirección de Entrega de Cenizas
                                                </label>
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={deliveryAddress}
                                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                                        placeholder="Ej. Av. Los Leones 567 (Dónde devolver cenizas)"
                                                        className="w-full p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* SECCIÓN EVIDENCIA FOTOGRÁFICA */}
                                    <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                    <Camera size={14} className="text-primary" /> Evidencia Fotográfica (Opcional)
                                                </label>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    Hasta 3 fotos. Recorte automático 1:1 optimizado en formato WebP.
                                                </p>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                                                {photoPreviews.length}/3
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            {photoPreviews.map((preview, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-primary/30 group bg-background">
                                                    <img src={preview} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                                    <span className="absolute top-1 left-1 text-[8px] font-black text-white bg-black/60 px-1.5 py-0.5 rounded uppercase">WebP</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePhoto(idx)}
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400 font-bold"
                                                        title="Eliminar foto"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}

                                            {photoPreviews.length < 3 && (
                                                <label className="aspect-square rounded-xl border-2 border-dashed border-foreground/15 hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/5 group">
                                                    <Camera size={22} className="text-muted-foreground group-hover:text-primary mb-1 transition-colors" />
                                                    <span className="text-[9px] font-bold text-muted-foreground group-hover:text-primary transition-colors text-center px-1">
                                                        + Agregar Foto
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handlePhotoSelect}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    {/* NOTAS INTERNAS */}
                                    <div>
                                        <label className="text-[11px] font-bold text-muted-foreground uppercase">Notas Internas / Instrucciones</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Detalles sobre timbre, contacto adicional o cuidados..."
                                            rows={2}
                                            className="w-full mt-1 p-2.5 rounded-xl bg-background border border-foreground/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* PASO 5: CÓDIGO DE SEGUIMIENTO Y ÉXITO */}
                            {step === 5 && createdResult && (
                                <div className="py-6 text-center space-y-6">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center ring-8 ring-emerald-500/10">
                                        <CheckCircle2 size={36} />
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black text-foreground">¡Orden Registrada con Éxito!</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Se ha generado la cremación para <span className="font-bold text-foreground">{createdResult.pet_name}</span> ({createdResult.customer_name})
                                        </p>
                                    </div>

                                    {/* Tracking Code Highlight Box */}
                                    <div className="max-w-md mx-auto p-5 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-xl space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                                            Código Único de Seguimiento (Tracking Code)
                                        </p>
                                        <div className="flex items-center justify-center gap-3">
                                            <span className="text-2xl sm:text-3xl font-mono font-black text-foreground tracking-widest bg-background/80 px-4 py-1.5 rounded-2xl border border-foreground/10 shadow-inner">
                                                {createdResult.verification_code}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={copyTrackingCode}
                                                className="p-3 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-95 flex items-center justify-center"
                                                title="Copiar solo el código"
                                            >
                                                {copiedTracking ? <Check size={18} /> : <Copy size={18} />}
                                            </button>
                                        </div>

                                        <div className="pt-2 border-t border-primary/10 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={copyTrackingLink}
                                                className="w-full py-2.5 px-4 rounded-xl bg-background/60 hover:bg-background border border-primary/20 text-xs font-bold text-primary hover:text-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                                            >
                                                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <ExternalLink size={14} />}
                                                <span>{copiedLink ? '¡Enlace Completo Copiado!' : 'Copiar Enlace Directo para el Cliente'}</span>
                                            </button>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground">
                                            La familia puede usar el código o el enlace directo para seguir el estado en tiempo real.
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-center gap-3 pt-2">
                                        <button
                                            onClick={onClose}
                                            className="px-5 py-2.5 rounded-2xl bg-foreground/10 text-foreground font-bold text-xs hover:bg-foreground/20 transition-all"
                                        >
                                            Cerrar
                                        </button>
                                        <a
                                            href={`/dashboard/recepcion-pedidos/registro?id=${createdResult.id}`}
                                            className="px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-1.5"
                                        >
                                            Ver Detalle de la Orden <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Controls (Steps 1 to 4) */}
                {step < 5 && (
                    <div className="px-6 py-4 border-t border-foreground/10 bg-foreground/5 flex items-center justify-between">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={() => setStep((step - 1) as any)}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-2xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-all flex items-center gap-1"
                            >
                                <ArrowLeft size={14} /> Atrás
                            </button>
                        ) : (
                            <div />
                        )}

                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={isSaving || loadingCatalogs}
                            className="px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="animate-spin" size={14} /> Guardando...
                                </>
                            ) : step === 4 ? (
                                <>
                                    <CheckCircle2 size={14} /> Finalizar y Generar Tracking
                                </>
                            ) : (
                                <>
                                    Siguiente <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Modal de Recorte y Optimización WebP de Imágenes */}
            {showCropper && cropSource && (
                <ImageCropper
                    image={cropSource}
                    aspect={1}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setShowCropper(false);
                        setCropSource(null);
                    }}
                    title="Recortar Foto de Evidencia (1:1 WebP)"
                />
            )}
        </div>
    );
}
