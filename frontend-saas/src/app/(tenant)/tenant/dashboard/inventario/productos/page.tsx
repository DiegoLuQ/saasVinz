"use client";

import React, { useEffect, useState } from 'react';
import {
    Package,
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2,
    Image as ImageIcon,
    X,
    Camera,
    BookOpen,
    Lock
} from 'lucide-react';
import { apiRequest, API_URL } from '@/lib/tenant/api';
import { useToast } from '@/app/(tenant)/tenant/context/ToastContext';
import Modal from '@/components/tenant/Modal';
import DeleteConfirmationModal from '@/components/tenant/DeleteConfirmationModal';
import CreatableSearchableSelect from '@/components/tenant/CreatableSearchableSelect';
import SearchableSelect from '@/components/tenant/SearchableSelect';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/tenant/imageUtils';
import { usePermissions } from '@/app/(tenant)/tenant/context/PermissionContext';
import { useTenant } from '@/app/(tenant)/tenant/context/TenantContext';
import { useProductCategories, useProductProviders } from '@/hooks/useSessionBootstrap';
import { useProducts, useSaveProduct, useDeleteProduct, useUpdateStock } from '@/hooks/useInventory';
import { useQueryClient } from '@tanstack/react-query';
import { PlanLimitModal } from '@/components/tenant/PlanLimitModal';
import { useFeatures } from '@/hooks/useFeatures';
import dynamic from 'next/dynamic';

const DownloadLink = dynamic(() => import('@/components/tenant/catalog/PDFDownloadButton'), { ssr: false });

interface Product {
    id: number;
    code: string;
    name: string;
    category_id: number;
    provider_id: number;
    cost_price: number;
    sale_price: number;
    stock: number;
    description: string;
    image_url: string;
    images: string[];
    availability_status: string;
    is_active: boolean;
    discount_percentage?: number;
    category?: { name: string };
    provider?: { name: string };
}

interface Category {
    id: number;
    name: string;
}

interface Provider {
    id: number;
    name: string;
}

interface PendingImage {
    blob: Blob;
    preview: string;
}

export default function ProductsPage() {
    const { showToast } = useToast();
    const { canCreate, canEdit, canDelete } = usePermissions();
    const { tenantData, formatLimit } = useTenant();
    const queryClient = useQueryClient();
    const { hasFeature } = useFeatures();

    const canViewCatalog = hasFeature('inventario:productos:catalogo');
    const canCreateProductFeature = hasFeature('inventario:productos:crear');

    // TanStack Query Hooks
    const { data: products = [], isLoading: loadingProducts } = useProducts();
    const saveProductMutation = useSaveProduct();
    const deleteProductMutation = useDeleteProduct();
    const updateStockMutation = useUpdateStock();

    // Consolidated data from Bootstrap
    const bootstrapCategories = useProductCategories();
    const bootstrapProviders = useProductProviders();

    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    // Image Upload & Cropping State
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const [isMainImageCrop, setIsMainImageCrop] = useState(true);

    // Pending Images (Deferred Upload)
    const [pendingMainImage, setPendingMainImage] = useState<PendingImage | null>(null);
    const [pendingGalleryImages, setPendingGalleryImages] = useState<PendingImage[]>([]);

    const [showLimitModal, setShowLimitModal] = useState(false);
    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [catalogOnlyAvailable, setCatalogOnlyAvailable] = useState(false);
    const [catalogShowPrices, setCatalogShowPrices] = useState(true);

    const getLogoUrl = () => {
        if (!tenantData?.logo_url) return null;
        return tenantData.logo_url.startsWith('http') ? tenantData.logo_url : `${API_URL}${tenantData.logo_url}`;
    };

    const maxProducts = tenantData?.subscription_plan?.max_products || 0;
    const isLimitReached = maxProducts > 0 && maxProducts < 999999 && products.length >= maxProducts;


    const handleOpenModal = (product?: Product) => {
        if (!product && isLimitReached) {
            setShowLimitModal(true);
            return;
        }
        if (product) {
            setCurrentProduct({ ...product });
        } else {
            setCurrentProduct({
                code: '',
                name: '',
                category_id: 0,
                provider_id: 0,
                cost_price: 0,
                sale_price: 0,
                stock: 0,
                description: '',
                image_url: '',
                availability_status: 'Disponible',
                is_active: true
            });
        }
        // Reset pending images
        setPendingMainImage(null);
        setPendingGalleryImages([]);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // IDs are already set by the CreatableSearchableSelect onChange or onCreate callbacks
            // We just ensure they are numbers

            // 3. Upload pending images first
            let uploadedMainImageUrl = currentProduct?.image_url;
            const newGalleryImageUrls: string[] = [];

            // Helper: sube un blob vía apiRequest (axios), que adjunta Authorization
            // Y X-Tenant-ID. Esto último es imprescindible cuando el usuario es
            // SuperAdmin operando dentro de un tenant: sin ese header el endpoint
            // responde 400 ("debes especificar X-Tenant-ID"). El fetch crudo anterior
            // no lo enviaba, por eso solo fallaba la subida de la foto.
            const uploadBlob = async (blob: Blob, filename: string): Promise<string> => {
                const formData = new FormData();
                formData.append('file', blob, filename);
                const data = await apiRequest('/api/internal/products/upload-image', {
                    method: 'POST',
                    body: formData,
                });
                return data.image_url;
            };

            // Upload Main Image
            if (pendingMainImage) {
                uploadedMainImageUrl = await uploadBlob(pendingMainImage.blob, 'product_main.jpg');
            }

            // Upload Gallery Images
            for (const pendingImg of pendingGalleryImages) {
                newGalleryImageUrls.push(await uploadBlob(pendingImg.blob, 'product_gallery.jpg'));
            }

            // Combine existing galleries with new uploaded ones
            const finalGallery = [...(currentProduct?.images || []), ...newGalleryImageUrls];

            const productToSave = {
                ...currentProduct,
                // Ensure IDs are valid numbers
                category_id: Number(currentProduct?.category_id),
                provider_id: Number(currentProduct?.provider_id),
                image_url: uploadedMainImageUrl,
                images: finalGallery
            };

            const isEdit = !!currentProduct?.id;

            await saveProductMutation.mutateAsync({
                isEdit,
                product: productToSave
            });

            setIsModalOpen(false);
        } catch (err: any) {
            // Antes este catch se tragaba el error en silencio (incluida la subida
            // de la foto), por eso parecía que "no dejaba agregar la imagen".
            console.error('Error al guardar producto:', err);
            showToast(err?.message || 'No se pudo guardar el producto', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!productToDelete) return;
        try {
            await deleteProductMutation.mutateAsync(productToDelete.id);
            setProductToDelete(null);
        } catch (err: any) {
            setProductToDelete(null);
        }
    };

    const handleInlineStockUpdate = async (product: Product, newStock: number) => {
        if (newStock === product.stock) return;
        const newStatus = newStock > 0 ? 'Disponible' : 'Agotado';
        try {
            await updateStockMutation.mutateAsync({
                id: product.id,
                stock: newStock,
                status: newStatus
            });
        } catch (err: any) {
            // Error handled in mutation
        }
    };

    // Initial Image Selection -> Triggers Cropper
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isMain: boolean = true) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setCroppingImage(reader.result as string);
            setIsMainImageCrop(isMain);
            setIsCropping(true);
            setZoom(1);
        });
        reader.readAsDataURL(file);
        // Reset input value to allow re-selecting same file
        e.target.value = '';
    };

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropCancel = () => {
        setIsCropping(false);
        setCroppingImage(null);
    };

    const handleCropConfirm = async () => {
        if (!croppingImage || !croppedAreaPixels) return;

        try {
            const croppedBlob = await getCroppedImg(croppingImage, croppedAreaPixels);
            if (!croppedBlob) throw new Error("Error creating cropped image");

            const previewUrl = URL.createObjectURL(croppedBlob);

            if (isMainImageCrop) {
                setPendingMainImage({ blob: croppedBlob, preview: previewUrl });
            } else {
                if ((currentProduct?.images?.length || 0) + pendingGalleryImages.length >= 3) {
                    showToast('Máximo 3 imágenes en galería', 'error');
                } else {
                    setPendingGalleryImages(prev => [...prev, { blob: croppedBlob, preview: previewUrl }]);
                }
            }

            setIsCropping(false);
            setCroppingImage(null);
        } catch (e) {
            console.error(e);
            showToast('Error al recortar la imagen', 'error');
        }
    };

    const removeGalleryImage = (index: number) => {
        // We have mixed sources: existing (currentProduct.images) and pending (pendingGalleryImages)
        // Since we display them combined in UI, let's assume the user clicked index `i` in the combined list
        // Strategy: Render [Existing] then [Pending]

        const existingCount = currentProduct?.images?.length || 0;

        if (index < existingCount) {
            // Removing an existing image
            const newImages = [...(currentProduct?.images || [])];
            newImages.splice(index, 1);
            setCurrentProduct(prev => ({ ...prev, images: newImages }));
        } else {
            // Removing a pending image
            const pendingIndex = index - existingCount;
            const newPending = [...pendingGalleryImages];
            newPending.splice(pendingIndex, 1);
            setPendingGalleryImages(newPending);
        }
    };

    const filteredProducts = products.filter(p =>
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const catalogProducts = React.useMemo(() => {
        let list = filteredProducts;
        if (catalogOnlyAvailable) {
            list = list.filter(p => p.stock > 0 && p.availability_status?.toLowerCase() !== 'agotado');
        }
        return list;
    }, [filteredProducts, catalogOnlyAvailable]);

    // Render Helpers
    const getMainImagePreview = () => {
        if (pendingMainImage) return pendingMainImage.preview;
        if (currentProduct?.image_url) return `${API_URL}${currentProduct.image_url}`;
        return null;
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
                    <p className="text-muted-foreground mt-1">Inventario de urnas y accesorios.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs font-semibold text-muted-foreground px-4 py-2 bg-white/5 rounded-full border border-white/5 h-fit whitespace-nowrap">
                        Total: {products.length} / {formatLimit(tenantData?.subscription_plan?.max_products)}
                    </div>
                    <button
                        onClick={() => canViewCatalog ? setShowCatalogModal(true) : setShowLimitModal(true)}
                        className={`border border-white/10 font-bold py-3 px-6 rounded-2xl flex items-center justify-center transition-all text-sm ${
                            canViewCatalog 
                            ? 'bg-white/5 text-white hover:bg-white/10 hover:border-amber-500/30 active:scale-95' 
                            : 'bg-white/5 text-white/50 hover:bg-white/10 cursor-pointer'
                        }`}
                        title={!canViewCatalog ? "Característica Premium" : "Ver Catálogo de Ventas"}
                    >
                        {!canViewCatalog ? (
                            <Lock className="mr-2 text-amber-500/80" size={18} />
                        ) : (
                            <BookOpen className="mr-2" size={18} />
                        )}
                        Ver Catálogo
                    </button>
                    {canCreate('inventario') && (
                        <button
                            onClick={() => canCreateProductFeature ? handleOpenModal() : showToast('Tu plan no incluye crear productos.', 'error')}
                            disabled={isLimitReached || !canCreateProductFeature}
                            title={!canCreateProductFeature ? 'Característica no incluida en tu plan' : undefined}
                            className={`bg-primary text-primary-foreground font-bold py-3 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm ${(isLimitReached || !canCreateProductFeature) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            {!canCreateProductFeature ? <Lock className="mr-2" size={18} /> : <Plus className="mr-2" size={18} />}
                            Nuevo Producto
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="glass-card rounded-3xl p-4 flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                    />
                </div>
            </div>

            {/* Table */}
            {loadingProducts ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
            ) : (
                <div className="glass-card rounded-3xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Producto</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoría</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Estado</th>
                                <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center">
                                            <div className="w-12 h-12 rounded-xl bg-white/5 mr-4 overflow-hidden shrink-0 flex items-center justify-center">
                                                {product.image_url ? (
                                                    <img src={`${API_URL}${product.image_url}`} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="text-muted-foreground" size={24} />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm leading-tight">{product.name}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono uppercase tracking-wider">{product.code}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-sm">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                                            {product.category?.name || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                defaultValue={product.stock}
                                                onBlur={(e) => handleInlineStockUpdate(product, Number(e.target.value))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        (e.target as HTMLInputElement).blur();
                                                    }
                                                }}
                                                className="w-16 bg-white/5 border border-white/10 rounded-xl py-2 px-2 text-center text-sm focus:border-primary/50 outline-none transition-all font-bold"
                                            />
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase">un.</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-primary">
                                                ${product.sale_price.toLocaleString('es-CL')}
                                            </span>
                                            {product.discount_percentage !== undefined && product.discount_percentage > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-lg uppercase tracking-wider border border-rose-500/20">
                                                    -{product.discount_percentage}%
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-middle">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${product.availability_status === 'Disponible'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            {product.availability_status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-middle text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenModal(product)}
                                                className="p-2.5 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white transition-all active:scale-90"
                                                title="Editar producto"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            {canDelete('inventario') && (
                                                <button
                                                    onClick={() => setProductToDelete(product)}
                                                    className="p-2.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all active:scale-90"
                                                    title="Eliminar producto"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={currentProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Image Upload Section */}
                        <div className="md:col-span-2 flex justify-center mb-4">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-2xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors">
                                    {getMainImagePreview() ? (
                                        <img src={getMainImagePreview() || ''} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-2">
                                            <ImageIcon className="mx-auto mb-2 text-muted-foreground" size={24} />
                                            <span className="text-xs text-muted-foreground">Imagen Principal</span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageSelect(e, true)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    {/* Overlay for pending upload state if we wanted to show it during save, but loader is on button */}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Código</label>
                            <input
                                required
                                value={currentProduct?.code || ''}
                                onChange={(e) => setCurrentProduct({ ...currentProduct, code: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Nombre</label>
                            <input
                                required
                                value={currentProduct?.name || ''}
                                onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Categoría</label>
                            <CreatableSearchableSelect
                                options={bootstrapCategories.map((c: any) => ({ value: c.id, label: c.name }))}
                                value={currentProduct?.category_id || null}
                                onChange={(val) => setCurrentProduct({ ...currentProduct, category_id: Number(val) })}
                                onCreate={async (name) => {
                                    try {
                                        const res = await apiRequest('/api/internal/products/categories', {
                                            method: 'POST',
                                            body: JSON.stringify({ name })
                                        });
                                        // Refetch bootstrap or simply expect the user to refetch if needed, 
                                        // but for UX we just update state or wait for query refresh
                                        queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
                                        queryClient.invalidateQueries({ queryKey: ['products'] });
                                        setCurrentProduct({ ...currentProduct, category_id: res.id });
                                        showToast(`Categoría "${name}" creada`, 'success');
                                    } catch (err: any) {
                                        showToast(err.message, 'error');
                                    }
                                }}
                                placeholder="Seleccionar o crear..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Proveedor</label>
                            <CreatableSearchableSelect
                                options={bootstrapProviders.map((p: any) => ({ value: p.id, label: p.name }))}
                                value={currentProduct?.provider_id || null}
                                onChange={(val) => setCurrentProduct({ ...currentProduct, provider_id: Number(val) })}
                                onCreate={async (name) => {
                                    try {
                                        const res = await apiRequest('/api/internal/products/providers', {
                                            method: 'POST',
                                            body: JSON.stringify({ name })
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['session-bootstrap'] });
                                        queryClient.invalidateQueries({ queryKey: ['products'] });
                                        setCurrentProduct({ ...currentProduct, provider_id: res.id });
                                        showToast(`Proveedor "${name}" creado`, 'success');
                                    } catch (err: any) {
                                        showToast(err.message, 'error');
                                    }
                                }}
                                placeholder="Seleccionar o crear..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Precio Costo</label>
                            <input
                                type="number"
                                value={currentProduct?.cost_price || 0}
                                onChange={(e) => setCurrentProduct({ ...currentProduct, cost_price: Number(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Precio Venta</label>
                            <input
                                type="number"
                                value={currentProduct?.sale_price || 0}
                                onChange={(e) => setCurrentProduct({ ...currentProduct, sale_price: Number(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Stock</label>
                            <input
                                type="number"
                                value={currentProduct?.stock ?? 0}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setCurrentProduct({
                                        ...currentProduct,
                                        stock: val,
                                        availability_status: val > 0 ? 'Disponible' : 'Agotado'
                                    });
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Descuento (%)</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={currentProduct?.discount_percentage ?? 0}
                                onChange={(e) => setCurrentProduct({ ...currentProduct, discount_percentage: Math.min(100, Math.max(0, Number(e.target.value))) })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Estado</label>
                            <SearchableSelect
                                options={[
                                    { value: 'Disponible', label: 'Disponible' },
                                    { value: 'Agotado', label: 'Agotado' }
                                ]}
                                value={currentProduct?.availability_status || 'Disponible'}
                                onChange={(val) => setCurrentProduct({ ...currentProduct, availability_status: String(val) })}
                                placeholder="Seleccionar..."
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Descripción</label>
                            <textarea
                                value={currentProduct?.description || ''}
                                onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 outline-none focus:border-primary/50 min-h-[80px]"
                            />
                        </div>

                        {/* Gallery */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-bold text-muted-foreground ml-1">Galería (Máx 3)</label>
                            <div className="flex gap-4">
                                {/* existing images */}
                                {currentProduct?.images?.map((img, idx) => (
                                    <div key={`existing-${idx}`} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                                        <img src={`${API_URL}${img}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeGalleryImage(idx)}
                                            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {/* pending images */}
                                {pendingGalleryImages.map((img, idx) => (
                                    <div key={`pending-${idx}`} className="relative w-20 h-20 rounded-xl overflow-hidden group border-2 border-primary/50">
                                        <img src={img.preview} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeGalleryImage((currentProduct?.images?.length || 0) + idx)}
                                            className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}

                                {((currentProduct?.images?.length || 0) + pendingGalleryImages.length) < 3 && (
                                    <label className="w-20 h-20 rounded-xl bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                                        <Plus size={24} className="text-muted-foreground" />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageSelect(e, false)}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-2xl hover:bg-white/5 font-bold transition-all">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center">
                            {isSaving && <Loader2 className="animate-spin mr-2" size={18} />}
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Cropper Modal Overlay */}
            {isCropping && croppingImage && (
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
                                aspect={1} // 1:1 Aspect Ratio
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
            )}

            <DeleteConfirmationModal
                isOpen={!!productToDelete}
                onClose={() => setProductToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar Producto?"
                description={`Estás a punto de eliminar "${productToDelete?.name}".`}
            />
            {/* Modal de Límite */}
            <PlanLimitModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceName="Productos"
            />

            {/* Catálogo Modal */}
            <Modal
                isOpen={showCatalogModal}
                onClose={() => setShowCatalogModal(false)}
                title="Catálogo de Productos"
                maxWidth="max-w-7xl"
            >
                <div className="space-y-6">
                    {/* PDF Download Button & Catalog Options */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.06] rounded-3xl p-5">
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-3 text-xs font-bold text-white uppercase tracking-wider cursor-pointer group select-none">
                                <input
                                    type="checkbox"
                                    checked={catalogOnlyAvailable}
                                    onChange={(e) => setCatalogOnlyAvailable(e.target.checked)}
                                    className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 text-amber-500 focus:ring-amber-500/20 focus:ring-offset-0 cursor-pointer transition-all group-hover:border-amber-500/30"
                                />
                                <span className="group-hover:text-amber-400 transition-colors">Solo Disponibles</span>
                            </label>
                            
                            <label className="flex items-center gap-3 text-xs font-bold text-white uppercase tracking-wider cursor-pointer group select-none">
                                <input
                                    type="checkbox"
                                    checked={catalogShowPrices}
                                    onChange={(e) => setCatalogShowPrices(e.target.checked)}
                                    className="w-4.5 h-4.5 rounded border-white/10 bg-white/5 text-amber-500 focus:ring-amber-500/20 focus:ring-offset-0 cursor-pointer transition-all group-hover:border-amber-500/30"
                                />
                                <span className="group-hover:text-amber-400 transition-colors">Mostrar Precios</span>
                            </label>
                        </div>
                        <div className="shrink-0">
                            {hasFeature('inventario:productos:descargar_pdf') ? (
                                <DownloadLink
                                    products={catalogProducts}
                                    showPrices={catalogShowPrices}
                                    tenantName={tenantData?.name || 'Catálogo de Productos'}
                                    logoUrl={getLogoUrl()}
                                    filename={`catalogo-${tenantData?.name?.toLowerCase().replace(/\s+/g, '-') || 'productos'}.pdf`}
                                />
                            ) : (
                                <button
                                    onClick={() => setShowLimitModal(true)}
                                    className="bg-white/5 text-white/50 border border-white/10 font-bold py-2.5 px-5 rounded-2xl flex items-center transition-all text-sm cursor-pointer"
                                    title="Característica Premium"
                                >
                                    <Lock className="mr-2 text-amber-500/80" size={16} />
                                    Descargar PDF
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Catalog Content */}
                    <div className="bg-[#0f1117] rounded-3xl border border-white/[0.06] overflow-hidden">
                        {/* Header */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-amber-900/30 via-primary/5 to-transparent border-b border-white/[0.06] px-8 py-10">
                            <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
                            <div className="flex items-center gap-6 relative z-10">
                                {getLogoUrl() && (
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-2">
                                        <img
                                            src={getLogoUrl()!}
                                            alt="Logo"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight text-white">
                                        {tenantData?.name || 'Catálogo de Productos'}
                                    </h2>
                                    <p className="text-muted-foreground mt-1.5">
                                        Listado completo de productos y accesorios
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">
                                        {catalogProducts.length} producto{catalogProducts.length !== 1 ? 's' : ''} • {new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Product Grid */}
                        <div className="p-8">
                            {catalogProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Package size={48} className="text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground font-medium">No hay productos para mostrar</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {catalogProducts.map(product => (
                                        <div
                                            key={product.id}
                                            className="group bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden hover:border-amber-500/25 hover:bg-white/[0.05] hover:-translate-y-0.5 transition-all duration-300"
                                        >
                                            <div className="w-full h-44 bg-gradient-to-br from-white/[0.02] to-white/[0.06] flex items-center justify-center overflow-hidden relative">
                                                {product.discount_percentage !== undefined && product.discount_percentage > 0 && (
                                                    <div className="absolute top-2 left-2 z-10 bg-gradient-to-br from-rose-500 to-rose-600 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg shadow-rose-500/30 flex items-center gap-1 uppercase tracking-wider">
                                                        <span>-{product.discount_percentage}%</span>
                                                    </div>
                                                )}
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                                                        <Package size={52} />
                                                        <span className="text-[9px] font-bold uppercase tracking-widest">Sin imagen</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-5 space-y-3">
                                                <div>
                                                    <p className="font-bold text-sm leading-tight line-clamp-1 text-white">{product.name}</p>
                                                    <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-wider mt-0.5">{product.code}</p>
                                                </div>
                                                <div className="flex items-center justify-between min-h-[28px]">
                                                    {catalogShowPrices ? (
                                                        <div className="flex items-baseline gap-2">
                                                            <p className="text-xl font-black text-amber-400">
                                                                ${product.discount_percentage !== undefined && product.discount_percentage > 0
                                                                    ? Math.round(product.sale_price * (1 - product.discount_percentage / 100)).toLocaleString('es-CL')
                                                                    : product.sale_price.toLocaleString('es-CL')
                                                                }
                                                            </p>
                                                            {product.discount_percentage !== undefined && product.discount_percentage > 0 && (
                                                                <span className="text-[10px] text-muted-foreground/40 line-through">
                                                                    ${product.sale_price.toLocaleString('es-CL')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-md">
                                                            Consultar precio
                                                        </span>
                                                    )}

                                                    <div className="flex items-center gap-1.5">
                                                        {(product.stock <= 0 || product.availability_status?.toLowerCase() === 'agotado') && (
                                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                                                                Agotado
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`inline-block w-3 h-3 rounded-full ${
                                                                (product.stock <= 0 || product.availability_status?.toLowerCase() === 'agotado')
                                                                    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                                                    : product.stock === 1
                                                                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                                                                    : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
                                                            }`}
                                                            title={
                                                                (product.stock <= 0 || product.availability_status?.toLowerCase() === 'agotado')
                                                                    ? 'Sin stock'
                                                                    : product.stock === 1
                                                                    ? 'Última unidad'
                                                                    : 'Stock disponible'
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold bg-white/5 text-muted-foreground border border-white/5 uppercase tracking-wide">
                                                        {product.category?.name || 'Sin categoría'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-white/[0.04] px-8 py-4 flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground/40 font-mono">
                                {tenantData?.name || 'Sistema'} • Catálogo generado el {new Date().toLocaleDateString('es-CL')}
                            </p>
                            <p className="text-[10px] text-muted-foreground/30 font-mono">
                                {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

