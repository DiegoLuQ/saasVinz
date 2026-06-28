"use client";

import React, { useEffect, useState } from 'react';
import {
    Dog,
    Plus,
    Search,
    Calendar,
    User,
    Edit2,
    Trash2,
    Loader2,
    Tag,
    Camera,
    Activity,
    ChevronRight,
    Filter
} from 'lucide-react';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import { TableSkeleton, CardSkeleton } from '@/components/tenant/ui/Skeleton';
import { apiRequest, API_URL, getImageUrl } from '@/lib/tenant/api';
import { motion, AnimatePresence } from 'framer-motion';
import { usePets, useSavePet, useDeletePet } from '@/hooks/usePets';
import { useCustomers } from '@/hooks/useCustomers';
import {
    MoreVertical,
    Heart,
    Link as LinkIcon
} from 'lucide-react';
import MemorialSetupModal from '@/components/tenant/memorials/MemorialSetupModal';
import { useFeatures } from '@/hooks/useFeatures';

import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/tenant/imageUtils';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';

interface Pet {
    id: number;
    name: string;
    species: string;
    breed: string;
    size?: string;
    birth_date: string;
    death_date?: string;
    age: number;
    status: string;
    customer_id: number;
    image_url?: string;
    images?: string[];
    created_at?: string;
}

import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import Modal from '@/components/tenant/Modal';
import DeleteConfirmationModal from '@/components/tenant/DeleteConfirmationModal';

interface Customer {
    id: number;
    name: string;
}

export default function PetsPage() {
    const { showToast } = useToast();
    const { canDelete, canCreate } = usePermissions();
    const { tenantData, formatLimit } = useTenant();
    const { hasFeature } = useFeatures();

    // Memoriales: característica configurable por plan desde admin -> Planes -> "Configurar Características"
    const canUseMemorial = hasFeature('mascotas:memorial');

    // TanStack Query Hooks
    const { data: pets = [], isLoading: loadingPets } = usePets();
    const { data: customers = [] } = useCustomers();
    const savePetMutation = useSavePet();
    const deletePetMutation = useDeletePet();

    const [searchTerm, setSearchTerm] = useState('');

    // Pagination & Sorting States
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOption, setSortOption] = useState('created_desc');
    const ITEMS_PER_PAGE = 12;

    // Modal & Form States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentPet, setCurrentPet] = useState<Partial<Pet> | null>(null);
    const [selectedImages, setSelectedImages] = useState<Blob[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    // Cropper States
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageToDelete, setImageToDelete] = useState<{ index: number; url: string; isRemote: boolean } | null>(null);
    const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
    const [memorialPet, setMemorialPet] = useState<Pet | null>(null);
    const [isMemorialModalOpen, setIsMemorialModalOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

    const [showLimitModal, setShowLimitModal] = useState(false);

    const maxPets = tenantData?.subscription_plan?.max_pets || 0;

    // La cuota es POR MES (se reinicia el día 1); el backend cuenta solo los
    // registros del mes actual (limit_checker.py, type "monthly"). El indicador
    // y el bloqueo deben usar el uso mensual, no el total histórico.
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthlyUsage = pets.filter(
        (p) => p.created_at && new Date(p.created_at) >= startOfMonth
    ).length;

    const isLimitReached = maxPets > 0 && maxPets < 999999 && monthlyUsage >= maxPets;


    const handleOpenModal = (pet?: Pet) => {
        if (!pet && isLimitReached) {
            setShowLimitModal(true);
            return;
        }
        setCurrentPet(pet || { name: '', species: 'canino', breed: '', customer_id: 0, status: 'received' });
        setSelectedImages([]);
        setImagePreviews(pet?.images || []);
        setIsModalOpen(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + selectedImages.length > 3) {
            showToast('Máximo 3 imágenes permitidas', 'error');
            return;
        }
        if (files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCroppingImage(reader.result as string);
                setCurrentImageIndex(selectedImages.length);
                setIsCropping(true);
            });
            reader.readAsDataURL(files[0]);
        }
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropConfirm = async () => {
        try {
            if (croppingImage && croppedAreaPixels) {
                const croppedBlob = await getCroppedImg(croppingImage, croppedAreaPixels);
                if (croppedBlob) {
                    setSelectedImages(prev => [...prev, croppedBlob]);
                    setImagePreviews(prev => [...prev, URL.createObjectURL(croppedBlob)]);
                    setIsCropping(false);
                    setCroppingImage(null);
                }
            }
        } catch (e) {
            console.error(e);
            showToast('Error al recortar la imagen', 'error');
        }
    };

    const handleCropCancel = () => {
        setIsCropping(false);
        setCroppingImage(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentPet?.customer_id) {
            showToast('Selecciona un dueño para la mascota', 'error');
            return;
        }

        // Validación: Al menos 1 imagen
        if (selectedImages.length === 0 && (!currentPet?.images || currentPet.images.length === 0)) {
            showToast('Debe subir al menos 1 imagen', 'error');
            return;
        }

        setIsSaving(true);
        try {
            let imageUrls: string[] = currentPet?.images || [];

            // Upload new images
            if (selectedImages.length > 0) {
                for (const image of selectedImages) {
                    const formData = new FormData();
                    formData.append('file', image, 'pet.jpg');

                    const uploadRes = await apiRequest(`/api/internal/pets/upload-image?pet_name=${currentPet?.name}&customer_id=${currentPet?.customer_id}`, {
                        method: 'POST',
                        body: formData,
                    });
                    imageUrls.push(uploadRes.image_url);
                }
            }

            const isEdit = !!currentPet?.id;

            // Sanitize optional fields to avoid empty string validation errors in the backend
            const sanitizedPet = {
                ...currentPet,
                birth_date: currentPet?.birth_date && currentPet.birth_date !== '' ? currentPet.birth_date : null,
                death_date: currentPet?.death_date && currentPet.death_date !== '' ? currentPet.death_date : null,
                breed: currentPet?.breed && currentPet.breed.trim() !== '' ? currentPet.breed.trim() : null,
                images: imageUrls,
                image_url: imageUrls[0] || undefined,
                status: currentPet?.status ? currentPet.status.toLowerCase() : 'received'
            };

            await savePetMutation.mutateAsync({
                isEdit,
                pet: sanitizedPet as any
            });

            setIsModalOpen(false);
        } catch (err: any) {
            // Error handling is already in the mutation, but we catch it here to stop the flow
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDeleteImage = async () => {
        if (!imageToDelete) return;

        try {
            if (imageToDelete.isRemote && currentPet?.id) {
                // Borrar del servidor
                await apiRequest(`/api/internal/pets/delete-image?image_path=${encodeURIComponent(imageToDelete.url)}&pet_id=${currentPet.id}`, {
                    method: 'DELETE'
                });

                // Actualizar estado local del pet
                if (currentPet.images) {
                    const newImages = currentPet.images.filter(img => img !== imageToDelete.url);
                    const newMainImage = newImages[0] || undefined;
                    setCurrentPet({ ...currentPet, images: newImages, image_url: newMainImage });
                }
            } else {
                // Borrar solo del estado local (imágenes nuevas)
                // Esto ya se maneja al actualizar los arrays, pero aquí centralizamos la lógica
                const newSelected = selectedImages.filter((_, i) => i !== imageToDelete.index);
                const newPreviews = imagePreviews.filter((_, i) => i !== imageToDelete.index);
                setSelectedImages(newSelected);
                setImagePreviews(newPreviews);
            }

            // Actualizar arrays visuales si era remota (para que desaparezca del modal)
            if (imageToDelete.isRemote) {
                setImagePreviews(prev => prev.filter(img => img !== imageToDelete.url));
            } else {
                // Si era local, ya lo hicimos arriba, pero aseguramos consistencia
                setImagePreviews(prev => prev.filter((_, i) => i !== imageToDelete.index));
                setSelectedImages(prev => prev.filter((_, i) => i !== imageToDelete.index));
            }

            setImageToDelete(null);
            showToast('Imagen eliminada', 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleConfirmDeletePet = async () => {
        if (!petToDelete) return;
        try {
            await deletePetMutation.mutateAsync(petToDelete.id);
            setPetToDelete(null);
        } catch (err) {
            setPetToDelete(null);
        }
    };

    const handleDelete = (pet: Pet) => {
        setPetToDelete(pet);
    };

    const filteredPets = pets.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.species.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        switch (sortOption) {
            case 'name_asc':
                return a.name.localeCompare(b.name);
            case 'name_desc':
                return b.name.localeCompare(a.name);
            case 'date_desc': // Younger first (assuming birth_date)
                return new Date(b.birth_date).getTime() - new Date(a.birth_date).getTime();
            case 'date_asc': // Older first
                return new Date(a.birth_date).getTime() - new Date(b.birth_date).getTime();
            case 'created_asc':
                return a.id - b.id;
            case 'created_desc':
            default:
                return b.id - a.id;
        }
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredPets.length / ITEMS_PER_PAGE);
    const paginatedPets = filteredPets.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page on filter/sort change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortOption]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestión de Mascotas</h1>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">Directorio completo de mascotas registradas por los clientes.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="text-xs font-semibold text-muted-foreground px-4 py-2 bg-white/5 rounded-full border border-white/5 h-fit whitespace-nowrap">
                        Cuota del mes: {monthlyUsage} / {formatLimit(tenantData?.subscription_plan?.max_pets)}
                        <span className="opacity-60"> · Total: {pets.length}</span>
                    </div>
                    {canCreate('mascotas') && (
                        <button
                            onClick={() => handleOpenModal()}
                            disabled={isLimitReached}
                            className={`bg-primary text-primary-foreground font-bold min-h-[44px] py-3 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm ${isLimitReached ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            <Plus className="mr-2" size={18} />
                            Registrar Mascota
                        </button>
                    )}
                </div>
            </div>



            {/* Toolbar */}
            <div className="glass-card rounded-3xl p-4 flex flex-col md:flex-row gap-3 sm:gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, especie o raza..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                    />
                </div>

                {/* Sort Dropdown */}
                <div className="relative w-full md:min-w-[200px] md:w-auto">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-10 pr-8 outline-none focus:border-primary/50 transition-all text-sm appearance-none cursor-pointer text-muted-foreground"
                    >
                        <option value="created_desc">Recientes (Creación)</option>
                        <option value="created_asc">Antiguos (Creación)</option>
                        <option value="name_asc">Nombre (A-Z)</option>
                        <option value="name_desc">Nombre (Z-A)</option>
                        <option value="date_desc">Más Jóvenes (Fecha Nac.)</option>
                        <option value="date_asc">Más Viejos (Fecha Nac.)</option>
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground pointer-events-none" size={16} />
                </div>
            </div>

            {/* Content */}
            {
                loadingPets ? (
                    <CardSkeleton count={6} gridCols="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                        {paginatedPets.map((pet) => (
                            <motion.div
                                layout
                                key={pet.id}
                                className="glass-card rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 group hover:border-primary/30 transition-all duration-300"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 overflow-hidden ring-4 ring-white/5">
                                            {pet.image_url ? (
                                                <img
                                                    src={getImageUrl(pet.image_url)}
                                                    alt={pet.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Dog size={40} className="opacity-80" />
                                            )}
                                            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Camera size={20} className="text-white" />
                                            </div>
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center ${pet.status === 'activo' ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveDropdown(activeDropdown === pet.id ? null : pet.id);
                                            }}
                                            className="p-2.5 rounded-xl bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                                        >
                                            <MoreVertical size={16} />
                                        </button>

                                        <AnimatePresence>
                                            {activeDropdown === pet.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setActiveDropdown(null)}
                                                    />
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        className="absolute right-0 mt-2 w-48 bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                handleOpenModal(pet);
                                                                setActiveDropdown(null);
                                                            }}
                                                            className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3 transition-colors"
                                                        >
                                                            <Edit2 size={14} className="text-primary" />
                                                            Editar Mascota
                                                        </button>

                                                        {/* Configurar Memorial — habilitado por feature flag del plan */}
                                                        {canUseMemorial && (
                                                            <button
                                                                onClick={() => {
                                                                    setMemorialPet(pet);
                                                                    setIsMemorialModalOpen(true);
                                                                    setActiveDropdown(null);
                                                                }}
                                                                className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 flex items-center gap-3 transition-colors border-t border-white/5"
                                                            >
                                                                <Heart size={14} className="text-pink-400" />
                                                                Configurar Memorial
                                                            </button>
                                                        )}

                                                        {canDelete('mascotas') && (
                                                            <button
                                                                onClick={() => {
                                                                    handleDelete(pet);
                                                                    setActiveDropdown(null);
                                                                }}
                                                                className="w-full px-4 py-3 text-left text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-3 transition-colors border-t border-white/5"
                                                            >
                                                                <Trash2 size={14} />
                                                                Eliminar
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{pet.name}</h3>

                                        {/* Attributes Grid */}
                                        <div className="grid grid-cols-2 gap-2 mt-3">
                                            <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Especie</p>
                                                <p className="font-medium capitalize text-sm">{pet.species}</p>
                                            </div>
                                            <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Raza</p>
                                                <p className="font-medium capitalize text-sm truncate" title={pet.breed}>{pet.breed}</p>
                                            </div>
                                            {pet.size && (
                                                <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Tamaño</p>
                                                    <p className="font-medium capitalize text-sm">{pet.size}</p>
                                                </div>
                                            )}
                                            <div className="bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">Edad</p>
                                                <p className="font-medium text-sm">
                                                    {pet.age ? `${pet.age} años` : (
                                                        pet.birth_date ? (() => {
                                                            const diff = Date.now() - new Date(pet.birth_date).getTime();
                                                            const ageDate = new Date(diff);
                                                            return Math.abs(ageDate.getUTCFullYear() - 1970) + " años";
                                                        })() : 'N/A'
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="bg-white/5 p-3 rounded-2xl space-y-1">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Fechas</p>
                                            <div className="text-[10px] font-bold">
                                                <p><span className="text-primary/70 mr-1">Nac:</span> {pet.birth_date?.split('T')[0] || 'N/A'}</p>
                                                <p><span className="text-primary/70 mr-1">Fall:</span> {pet.death_date?.split('T')[0] || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-2xl space-y-1">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Dueño</p>
                                            <div className="flex items-center">
                                                <User size={12} className="mr-1 text-primary/70" />
                                                <p className="text-sm font-bold truncate">
                                                    {customers.find(c => c.id === pet.customer_id)?.name.split(' ')[0] || `ID #${pet.customer_id}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Empty State */}
                        {!loadingPets && filteredPets.length === 0 && (
                            <div className="sm:col-span-2 xl:col-span-3 h-64 flex flex-col items-center justify-center glass-card rounded-3xl sm:rounded-[3rem] border-dashed border-white/10 bg-transparent">
                                <Dog size={48} className="text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground font-medium">No se encontraron mascotas registradas</p>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Pagination Controls */}
            {
                !loadingPets && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl bg-white/5 border border-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight className="rotate-180" size={20} />
                        </button>
                        <span className="text-sm text-muted-foreground font-medium">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl bg-white/5 border border-white/5 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )
            }

            {/* Modal de Gestión de Macotas */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentPet?.id ? 'Editar Mascota' : 'Registrar Nueva Mascota'}
                maxWidth="max-w-4xl"
            >
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Image Upload Section - Gallery */}
                    <div className="flex flex-col items-center justify-center pb-4 border-b border-white/5">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-3">Fotos de la Mascota (mín 1, máx 3)</p>
                        <div className="flex gap-3">
                            {imagePreviews.map((preview, idx) => (
                                <div key={idx} className="relative group">
                                    <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                        <img src={getImageUrl(preview)} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const isRemote = preview.startsWith('/static') || preview.startsWith('http');
                                            setImageToDelete({
                                                index: idx,
                                                url: preview,
                                                isRemote
                                            });
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                            {imagePreviews.length < 3 && (
                                <div className="relative group cursor-pointer" onClick={() => document.getElementById('pet-image-upload')?.click()}>
                                    <div className="w-24 h-24 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center transition-all group-hover:border-primary/50">
                                        <div className="text-center">
                                            <Camera size={24} className="mx-auto text-muted-foreground mb-1" />
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Agregar</span>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                        <Plus size={12} />
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Modal de Confirmación para eliminar imagen */}
                        <Modal
                            isOpen={!!imageToDelete}
                            onClose={() => setImageToDelete(null)}
                            title="¿Eliminar imagen?"
                            maxWidth="max-w-sm"
                            zIndex="z-[400]"
                        >
                            <div className="space-y-4">
                                <p className="text-muted-foreground">
                                    {imageToDelete?.isRemote
                                        ? "Esta acción eliminará la imagen permanentemente del servidor. ¿Estás seguro?"
                                        : "¿Estás seguro de que quieres descartar esta imagen antes de guardar?"}
                                </p>
                                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setImageToDelete(null)}
                                        className="px-4 py-2 rounded-xl hover:bg-white/5 font-medium transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmDeleteImage}
                                        className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-lg hover:shadow-red-500/20"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </Modal>
                        <input
                            id="pet-image-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                        <p className="text-[10px] text-muted-foreground mt-3 uppercase font-bold tracking-widest">Formato 1:1 recomendado</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Nombre de la Mascota</label>
                            <input
                                required
                                value={currentPet?.name || ''}
                                onChange={(e) => setCurrentPet({ ...currentPet, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>


                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Dueño (Cliente)</label>
                            <SearchableSelect
                                options={customers.map(c => ({
                                    value: c.id,
                                    label: c.name
                                }))}
                                value={currentPet?.customer_id || 0}
                                onChange={(val) => setCurrentPet({ ...currentPet, customer_id: Number(val) })}
                                placeholder="Seleccionar un cliente..."
                                icon={<User size={16} />}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Especie</label>
                            <SearchableSelect
                                options={[
                                    { value: 'canino', label: 'Canino' },
                                    { value: 'felino', label: 'Felino' },
                                    { value: 'ave', label: 'Ave' },
                                    { value: 'mamifero', label: 'Mamífero Pequeño' },
                                    { value: 'reptil', label: 'Reptil / Anfibio' },
                                    { value: 'exotico', label: 'Exótico' },
                                    { value: 'otro', label: 'Otro' }
                                ]}
                                value={currentPet?.species || 'canino'}
                                onChange={(val) => setCurrentPet({ ...currentPet, species: String(val) })}
                                placeholder="Seleccionar especie..."
                                icon={<Dog size={16} />}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Raza (Opcional)</label>
                            <input
                                value={currentPet?.breed || ''}
                                onChange={(e) => setCurrentPet({ ...currentPet, breed: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                                placeholder="Ej: Labrador, Persa..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Tamaño</label>
                            <SearchableSelect
                                options={[
                                    { value: 'pequeño', label: 'Pequeño' },
                                    { value: 'mediano', label: 'Mediano' },
                                    { value: 'normal', label: 'Normal' },
                                    { value: 'grande', label: 'Grande' },
                                    { value: 'muy grande', label: 'Muy Grande' }
                                ]}
                                value={currentPet?.size || 'normal'}
                                onChange={(val) => setCurrentPet({ ...currentPet, size: String(val) })}
                                placeholder="Seleccionar tamaño..."
                                icon={<Tag size={16} />}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Fecha de Nacimiento (Opcional)</label>
                            <input
                                type="date"
                                value={currentPet?.birth_date?.split('T')[0] || ''}
                                onChange={(e) => setCurrentPet({ ...currentPet, birth_date: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Fecha de Fallecimiento (Opcional)</label>
                            <input
                                type="date"
                                value={currentPet?.death_date?.split('T')[0] || ''}
                                onChange={(e) => setCurrentPet({ ...currentPet, death_date: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        {currentPet?.id && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground ml-1">Estado</label>
                                <SearchableSelect
                                    options={[
                                        { value: 'received', label: 'Recibido' },
                                        { value: 'processing', label: 'En Proceso' },
                                        { value: 'delivered', label: 'Entregado' }
                                    ]}
                                    value={currentPet?.status || 'received'}
                                    onChange={(val) => setCurrentPet({ ...currentPet, status: String(val) })}
                                    placeholder="Seleccionar estado..."
                                    icon={<Activity size={16} />}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-3 rounded-2xl hover:bg-white/5 font-bold transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center"
                        >
                            {isSaving && <Loader2 className="animate-spin mr-2" size={18} />}
                            {currentPet?.id ? 'Guardar Cambios' : 'Registrar Mascota'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Cropper Modal Overlay */}
            {
                isCropping && croppingImage && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                        <div className="bg-[#1a1f2e] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[80vh]">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Recortar Imagen</h3>
                                <button onClick={handleCropCancel} className="text-muted-foreground hover:text-white transition-colors">
                                    <Plus className="rotate-45" size={24} />
                                </button>
                            </div>

                            <div className="relative flex-1 bg-black/50 overflow-hidden">
                                <Cropper
                                    image={croppingImage}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                    classes={{
                                        containerClassName: "bg-transparent",
                                        mediaClassName: "",
                                        cropAreaClassName: "border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
                                    }}
                                />
                            </div>

                            <div className="p-6 border-t border-white/5 space-y-6 bg-[#1a1f2e]">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-muted-foreground">Zoom</span>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={handleCropCancel}
                                        className="px-6 py-3 rounded-2xl hover:bg-white/5 font-bold transition-all text-muted-foreground hover:text-white"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCropConfirm}
                                        className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center"
                                    >
                                        <Camera className="mr-2" size={18} />
                                        Confirmar Recorte
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Modal de Confirmación para eliminar Mascota */}
            <DeleteConfirmationModal
                isOpen={!!petToDelete}
                onClose={() => setPetToDelete(null)}
                onConfirm={handleConfirmDeletePet}
                title="¿Eliminar Mascota?"
                description={`Estás a punto de eliminar a la mascota "${petToDelete?.name}". Esta acción no se puede deshacer.`}
            />
            {/* Modal de Límite */}
            <PlanLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceName="Mascotas"
            />
            {/* Memorial Setup Modal */}
            <MemorialSetupModal
                isOpen={isMemorialModalOpen}
                onClose={() => setIsMemorialModalOpen(false)}
                pet={memorialPet}
                tenantName={tenantData?.name}
            />
        </div >
    );
}

