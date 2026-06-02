import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapPin,
  Tag,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  TrendingUp,
  ImageIcon,
  GripVertical,
  Search,
  Loader2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Upload,
} from "lucide-react";
import {
  areaCategoryAreas,
  areaCategoryStoreArea,
  areaCategoryUpdateArea,
  areaCategoryDestroyArea,
  areaCategoryReorderAreas,
  areaCategoryCategories,
  areaCategoryStoreCategory,
  areaCategoryUpdateCategory,
  areaCategoryDestroyCategory,
  areaCategoryReorderCategories,
  areaCategoryUploadCategoryImage,
} from "../../../orval/generated/area-category";
import type { AreaResource, CategoryResource } from "../../../orval/generated/api.schemas";
import { ImageCropDialog } from "./ImageCropDialog";

// 既存コードが Area/Category 名で書かれているので、生成型に local alias する。
type Area = AreaResource;
type Category = CategoryResource;

type Tab = "areas" | "categories";

interface Toast {
  message: string;
  type: "success" | "error";
}

export function AreaCategoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("areas");
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingArea, setEditingArea] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [uploadingCategoryId, setUploadingCategoryId] = useState<number | null>(null);
  // カテゴリ画像のトリミング待ち (どのカテゴリか + File)
  const [pendingCategoryCrop, setPendingCategoryCrop] = useState<{ cat: Category; file: File } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  // Hidden file input refs per category
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchAreas = useCallback(async () => {
    try {
      const data = await areaCategoryAreas();
      setAreas(data);
    } catch (e) {
      console.error(e);
      showToast("エリアの取得に失敗しました", "error");
    }
  }, [showToast]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await areaCategoryCategories();
      setCategories(data);
    } catch (e) {
      console.error(e);
      showToast("カテゴリの取得に失敗しました", "error");
    }
  }, [showToast]);

  useEffect(() => {
    Promise.all([fetchAreas(), fetchCategories()]).finally(() => setLoading(false));
  }, [fetchAreas, fetchCategories]);

  const filteredAreas = areas.filter(a =>
    a.name.includes(searchQuery) || a.slug.includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories.filter(c =>
    c.name.includes(searchQuery) || c.slug.includes(searchQuery.toLowerCase())
  );

  const totalAreaShops = areas.filter(a => a.visible).reduce((sum, a) => sum + (a.shop_count || 0), 0);
  const totalCategoryShops = categories.filter(c => c.visible).reduce((sum, c) => sum + (c.shop_count || 0), 0);

  // --- Handlers ---

  const handleSaveAreaName = async (area: Area) => {
    setSaving(true);
    try {
      await areaCategoryUpdateArea(area.id, { name: area.name });
      setEditingArea(null);
      showToast("エリア名を更新しました");
    } catch (e) {
      console.error(e);
      showToast("エリア名の更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAreaVisible = async (area: Area) => {
    try {
      await areaCategoryUpdateArea(area.id, { visible: !area.visible });
      setAreas(prev => prev.map(a => a.id === area.id ? { ...a, visible: !a.visible } : a));
      showToast(area.visible ? "非表示にしました" : "表示にしました");
    } catch (e) {
      console.error(e);
      showToast("表示状態の変更に失敗しました", "error");
    }
  };

  const handleDeleteArea = async (area: Area) => {
    if (!confirm(`「${area.name}」を削除しますか？`)) return;
    try {
      await areaCategoryDestroyArea(area.id);
      setAreas(prev => prev.filter(a => a.id !== area.id));
      showToast(`「${area.name}」を削除しました`);
    } catch (e) {
      console.error(e);
      showToast("削除に失敗しました", "error");
    }
  };

  const handleMoveArea = async (id: number, direction: "up" | "down") => {
    const idx = areas.findIndex(a => a.id === id);
    if (direction === "up" && idx > 0) {
      const next = [...areas];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setAreas(next);
      try {
        await areaCategoryReorderAreas({ ids: next.map(a => a.id) });
        showToast("並び順を更新しました");
      } catch (e) {
        console.error(e);
        showToast("並び順の更新に失敗しました", "error");
        await fetchAreas();
      }
    } else if (direction === "down" && idx < areas.length - 1) {
      const next = [...areas];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setAreas(next);
      try {
        await areaCategoryReorderAreas({ ids: next.map(a => a.id) });
        showToast("並び順を更新しました");
      } catch (e) {
        console.error(e);
        showToast("並び順の更新に失敗しました", "error");
        await fetchAreas();
      }
    }
  };

  const handleSaveCategory = async (cat: Category) => {
    setSaving(true);
    try {
      const updated = await areaCategoryUpdateCategory(cat.id, {
        name: cat.name,
        slug: cat.slug,
        image_url: cat.image_url,
      });
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, ...updated } : c));
      setEditingCategory(null);
      showToast("カテゴリを更新しました");
    } catch (e) {
      console.error(e);
      showToast("カテゴリの更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCategoryVisible = async (cat: Category) => {
    try {
      await areaCategoryUpdateCategory(cat.id, { visible: !cat.visible });
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, visible: !c.visible } : c));
      showToast(cat.visible ? "非表示にしました" : "表示にしました");
    } catch (e) {
      console.error(e);
      showToast("表示状態の変更に失敗しました", "error");
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`「${cat.name}」を削除しますか？`)) return;
    try {
      await areaCategoryDestroyCategory(cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      showToast(`「${cat.name}」を削除しました`);
    } catch (e) {
      console.error(e);
      showToast("削除に失敗しました", "error");
    }
  };

  const handleMoveCategory = async (id: number, direction: "up" | "down") => {
    const idx = categories.findIndex(c => c.id === id);
    if (direction === "up" && idx > 0) {
      const next = [...categories];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setCategories(next);
      try {
        await areaCategoryReorderCategories({ ids: next.map(c => c.id) });
        showToast("並び順を更新しました");
      } catch (e) {
        console.error(e);
        showToast("並び順の更新に失敗しました", "error");
        await fetchCategories();
      }
    } else if (direction === "down" && idx < categories.length - 1) {
      const next = [...categories];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setCategories(next);
      try {
        await areaCategoryReorderCategories({ ids: next.map(c => c.id) });
        showToast("並び順を更新しました");
      } catch (e) {
        console.error(e);
        showToast("並び順の更新に失敗しました", "error");
        await fetchCategories();
      }
    }
  };

  const handleUploadCategoryImage = async (cat: Category, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast("画像サイズは5MB以下にしてください", "error");
      return;
    }
    setUploadingCategoryId(cat.id);
    try {
      const updated = await areaCategoryUploadCategoryImage(cat.id, { image: file });
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, ...updated } : c));
      showToast("カテゴリ画像を更新しました");
    } catch (e) {
      console.error(e);
      showToast("画像のアップロードに失敗しました", "error");
    } finally {
      setUploadingCategoryId(null);
    }
  };

  const handleAddSubmit = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setSaving(true);
    try {
      if (activeTab === "areas") {
        await areaCategoryStoreArea({ name: newName, slug: newSlug, visible: true });
        await fetchAreas();
        showToast(`エリア「${newName}」を追加しました`);
      } else {
        await areaCategoryStoreCategory({ name: newName, slug: newSlug, visible: true });
        await fetchCategories();
        showToast(`カテゴリ「${newName}」を追加しました`);
      }
      setShowAddModal(false);
      setNewName("");
      setNewSlug("");
    } catch (e) {
      console.error(e);
      showToast("追加に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-[13px] transition-all ${
          toast.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            エリア・カテゴリ管理
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            トップページの「エリアから探す」「カテゴリから探す」セクションのマスターデータを管理します
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">表示エリア数</p>
          <p className="text-2xl text-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            {areas.filter(a => a.visible).length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">エリア合計店舗</p>
          <p className="text-2xl text-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            {totalAreaShops.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">表示カテゴリ数</p>
          <p className="text-2xl text-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            {categories.filter(c => c.visible).length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">カテゴリ合計店舗</p>
          <p className="text-2xl text-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            {totalCategoryShops.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab("areas")}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] border-b-2 transition-colors ${
              activeTab === "areas"
                ? "border-gray-900 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="w-4 h-4" />
            エリア
            <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{areas.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] border-b-2 transition-colors ${
              activeTab === "categories"
                ? "border-gray-900 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="w-4 h-4" />
            カテゴリ
            <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{categories.length}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-[13px] border border-border rounded-lg bg-background w-48"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] hover:bg-gray-800 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            追加
          </button>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>
                {activeTab === "areas" ? "エリアを追加" : "カテゴリを追加"}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">名前</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background"
                  placeholder={activeTab === "areas" ? "渋谷" : "ラウンジ"}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">スラッグ</label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background"
                  placeholder={activeTab === "areas" ? "shibuya" : "lounge"}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddSubmit}
                disabled={saving || !newName.trim() || !newSlug.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* エリア一覧 */}
      {activeTab === "areas" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider w-12">順</th>
                    <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider">エリア名</th>
                    <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider">スラッグ</th>
                    <th className="px-4 py-3 text-right text-[11px] text-muted-foreground uppercase tracking-wider">店舗数</th>
                    <th className="px-4 py-3 text-center text-[11px] text-muted-foreground uppercase tracking-wider">表示</th>
                    <th className="px-4 py-3 text-right text-[11px] text-muted-foreground uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAreas.map((area, idx) => (
                    <tr key={area.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
                          <span className="text-[13px] text-muted-foreground">{idx + 1}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {editingArea === area.id ? (
                          <input
                            type="text"
                            value={area.name}
                            onChange={(e) => setAreas(prev => prev.map(a => a.id === area.id ? { ...a, name: e.target.value } : a))}
                            className="px-2 py-1 text-[13px] border border-border rounded bg-background w-28"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[13px] text-foreground">{area.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-[12px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">{area.slug}</code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[13px] text-foreground">{area.shop_count}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleAreaVisible(area)}
                        >
                          {area.visible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {editingArea === area.id ? (
                            <>
                              <button
                                onClick={() => handleSaveAreaName(area)}
                                className="p-1 rounded hover:bg-gray-100 text-emerald-500 transition"
                                disabled={saving}
                              >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setEditingArea(null)}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 transition"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleMoveArea(area.id, "up")}
                                disabled={idx === 0}
                                className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition disabled:opacity-30"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveArea(area.id, "down")}
                                disabled={idx === filteredAreas.length - 1}
                                className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition disabled:opacity-30"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingArea(area.id)}
                                className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteArea(area)}
                                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* カテゴリ一覧 */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider w-12">順</th>
                    <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider w-24">画像</th>
                    <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider">カテゴリ名</th>
                    <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider">スラッグ</th>
                    <th className="px-4 py-3 text-right text-[11px] text-muted-foreground uppercase tracking-wider">店舗数</th>
                    <th className="px-4 py-3 text-center text-[11px] text-muted-foreground uppercase tracking-wider">表示</th>
                    <th className="px-4 py-3 text-right text-[11px] text-muted-foreground uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((cat, idx) => {
                    const isEditing = editingCategory === cat.id;
                    const isUploading = uploadingCategoryId === cat.id;
                    return (
                      <tr key={cat.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition ${!cat.visible ? "opacity-60" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
                            <span className="text-[13px] text-muted-foreground">{idx + 1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            {cat.image_url ? (
                              <img
                                src={cat.image_url}
                                alt={cat.name}
                                className="w-20 h-20 rounded-lg object-cover border border-border"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                                <ImageIcon className="w-5 h-5" />
                                <span className="text-[10px] mt-0.5">画像なし</span>
                              </div>
                            )}
                            {isUploading && (
                              <div className="absolute inset-0 rounded-lg bg-white/70 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                              </div>
                            )}
                          </div>
                          <input
                            ref={(el) => { fileInputRefs.current[cat.id] = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setPendingCategoryCrop({ cat, file });
                              }
                              // reset so same file can be re-selected
                              e.target.value = "";
                            }}
                          />
                          <button
                            onClick={() => fileInputRefs.current[cat.id]?.click()}
                            disabled={isUploading}
                            className="mt-1.5 flex items-center gap-1 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-100 rounded transition disabled:opacity-50"
                          >
                            <Upload className="w-3 h-3" />
                            画像アップロード
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="text"
                              value={cat.name}
                              onChange={(e) => setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                              className="px-2 py-1 text-[13px] border border-border rounded bg-background w-32"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[13px] text-foreground">{cat.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={cat.slug}
                                onChange={(e) => setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, slug: e.target.value } : c))}
                                className="px-2 py-1 text-[12px] border border-border rounded bg-background w-32 font-mono"
                              />
                              <input
                                type="text"
                                placeholder="画像URL（直貼り）"
                                value={cat.image_url ?? ""}
                                onChange={(e) => setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, image_url: e.target.value || null } : c))}
                                className="px-2 py-1 text-[12px] border border-border rounded bg-background w-56"
                              />
                            </div>
                          ) : (
                            <code className="text-[12px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">{cat.slug}</code>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[13px] text-foreground">{cat.shop_count}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleToggleCategoryVisible(cat)}>
                            {cat.visible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveCategory(cat)}
                                  className="p-1 rounded hover:bg-gray-100 text-emerald-500 transition"
                                  disabled={saving}
                                >
                                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingCategory(null);
                                    fetchCategories();
                                  }}
                                  className="p-1 rounded hover:bg-gray-100 text-gray-400 transition"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleMoveCategory(cat.id, "up")}
                                  disabled={idx === 0}
                                  className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition disabled:opacity-30"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleMoveCategory(cat.id, "down")}
                                  disabled={idx === filteredCategories.length - 1}
                                  className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition disabled:opacity-30"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingCategory(cat.id)}
                                  className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-[12px] text-gray-500">
              ※ カテゴリ画像はユーザー画面の「カテゴリから探す」セクションの背景に使用されます。推奨サイズ: 260×320px。
              画像URLは直貼りまたはアップロードボタンから設定できます（最大5MB）。
            </p>
          </div>
        </div>
      )}

      {pendingCategoryCrop && (
        <ImageCropDialog
          file={pendingCategoryCrop.file}
          aspect={260 / 320}
          title="カテゴリ画像をトリミング"
          onCancel={() => setPendingCategoryCrop(null)}
          onCropped={async (cropped) => {
            const cat = pendingCategoryCrop.cat;
            setPendingCategoryCrop(null);
            await handleUploadCategoryImage(cat, cropped);
          }}
        />
      )}
    </div>
  );
}
