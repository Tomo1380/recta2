import { useState, useEffect, useCallback } from "react";
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
  Star,
  Loader2,
} from "lucide-react";
import { api } from "~/lib/api";

interface AreaItem {
  id: number;
  name: string;
  slug: string;
  tier: "gold" | "standard";
  visible: boolean;
  sort_order: number;
  shop_count: number;
}

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  color: string;
  visible: boolean;
  sort_order: number;
  shop_count: number;
}

type Tab = "areas" | "categories";

export function AreaCategoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("areas");
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingArea, setEditingArea] = useState<number | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  const fetchAreas = useCallback(async () => {
    try {
      const data = await api.get<AreaItem[]>("/admin/areas");
      setAreas(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get<CategoryItem[]>("/admin/categories");
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

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

  const handleSaveAreaName = async (area: AreaItem) => {
    setSaving(true);
    try {
      await api.put(`/admin/areas/${area.id}`, { name: area.name });
      setEditingArea(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAreaTier = async (area: AreaItem) => {
    const newTier = area.tier === "gold" ? "standard" : "gold";
    try {
      await api.put(`/admin/areas/${area.id}`, { tier: newTier });
      setAreas(prev => prev.map(a => a.id === area.id ? { ...a, tier: newTier } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAreaVisible = async (area: AreaItem) => {
    try {
      await api.put(`/admin/areas/${area.id}`, { visible: !area.visible });
      setAreas(prev => prev.map(a => a.id === area.id ? { ...a, visible: !a.visible } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteArea = async (area: AreaItem) => {
    if (!confirm(`「${area.name}」を削除しますか？`)) return;
    try {
      await api.delete(`/admin/areas/${area.id}`);
      setAreas(prev => prev.filter(a => a.id !== area.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCategoryVisible = async (cat: CategoryItem) => {
    try {
      await api.put(`/admin/categories/${cat.id}`, { visible: !cat.visible });
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, visible: !c.visible } : c));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!confirm(`「${cat.name}」を削除しますか？`)) return;
    try {
      await api.delete(`/admin/categories/${cat.id}`);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubmit = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setSaving(true);
    try {
      if (activeTab === "areas") {
        await api.post("/admin/areas", { name: newName, slug: newSlug, tier: "standard", visible: true });
        await fetchAreas();
      } else {
        await api.post("/admin/categories", { name: newName, slug: newSlug, color: newColor, visible: true });
        await fetchCategories();
      }
      setShowAddModal(false);
      setNewName("");
      setNewSlug("");
      setNewColor("#6366f1");
    } catch (e) {
      console.error(e);
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
              {activeTab === "categories" && (
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1">テーマカラー</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <code className="text-[12px] text-muted-foreground">{newColor}</code>
                  </div>
                </div>
              )}
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
                    <th className="px-4 py-3 text-center text-[11px] text-muted-foreground uppercase tracking-wider">ティア</th>
                    <th className="px-4 py-3 text-center text-[11px] text-muted-foreground uppercase tracking-wider">表示</th>
                    <th className="px-4 py-3 text-right text-[11px] text-muted-foreground uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAreas.map((area) => (
                    <tr key={area.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
                          <span className="text-[13px] text-muted-foreground">{area.sort_order}</span>
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
                          onClick={() => handleToggleAreaTier(area)}
                          className={`text-[11px] px-2.5 py-1 rounded-md transition ${
                            area.tier === "gold"
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {area.tier === "gold" ? "★ Gold" : "Standard"}
                        </button>
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

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-[13px] text-amber-800">
              💡 <strong>Goldティア</strong>のエリアはユーザー画面でゴールドのアイコンとハイライト表示になります。デザイン上は上位3エリア（店舗数が多いエリア）をGoldにすることを推奨します。
            </p>
          </div>
        </div>
      )}

      {/* カテゴリ一覧 */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                className={`bg-card border rounded-xl overflow-hidden transition ${
                  cat.visible ? "border-border hover:border-gray-300" : "border-border opacity-60"
                }`}
              >
                {/* Color preview strip */}
                <div className="h-2" style={{ backgroundColor: cat.color }} />

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
                        <Tag className="w-4 h-4" style={{ color: cat.color }} />
                      </div>
                      <div>
                        <p className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>{cat.name}</p>
                        <code className="text-[11px] text-muted-foreground">{cat.slug}</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleCategoryVisible(cat)}
                      >
                        {cat.visible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                      </button>
                      <button className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[13px] text-foreground">{cat.shop_count} 店舗</span>
                    </div>
                    <span className="text-[12px] text-muted-foreground">順序: {cat.sort_order}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-[12px] text-muted-foreground">テーマカラー:</label>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md border border-gray-200" style={{ backgroundColor: cat.color }} />
                      <code className="text-[11px] text-muted-foreground">{cat.color}</code>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-[12px] text-gray-500">カテゴリ画像設定済み</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add card */}
            <button
              onClick={() => setShowAddModal(true)}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition"
            >
              <Plus className="w-6 h-6" />
              <span className="text-[13px]">カテゴリを追加</span>
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-[12px] text-gray-500">
              ※ カテゴリ画像はユーザー画面の「カテゴリから探す」セクションの背景に使用されます。推奨サイズ: 260×320px。
              テーマカラーはカテゴリバッジやフィルターの配色に反映されます。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
