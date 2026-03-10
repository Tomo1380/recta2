import { useState, useEffect, useCallback } from "react";
import {
  Star,
  GripVertical,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Image,
  MessageCircle,
  Crown,
  ChevronDown,
  ChevronUp,
  Pencil,
  Save,
  X,
  Hash,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "~/lib/api";
import type { PickupShop, Consultation, BannerSettings, Store } from "~/lib/types";

type Tab = "pickup" | "consultations" | "banner";

interface Toast {
  message: string;
  type: "success" | "error";
}

export function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pickup");
  const [pickupShops, setPickupShops] = useState<PickupShop[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [banner, setBanner] = useState<BannerSettings>({ hero_tagline: "", hero_subtitle: "", hero_badge: "", hero_ai_label: "" });
  const [editingBanner, setEditingBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Add pickup shop modal
  const [showAddPickupModal, setShowAddPickupModal] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [storeResults, setStoreResults] = useState<Store[]>([]);
  const [searchingStores, setSearchingStores] = useState(false);

  // Add consultation modal
  const [showAddConsultationModal, setShowAddConsultationModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newCount, setNewCount] = useState(0);

  // Edit consultation modal
  const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPickupShops = useCallback(async () => {
    try {
      const data = await api.get<PickupShop[]>("/admin/pickup-shops");
      setPickupShops(data);
    } catch (e) {
      console.error(e);
      showToast("ピックアップ店舗の取得に失敗しました", "error");
    }
  }, [showToast]);

  const fetchConsultations = useCallback(async () => {
    try {
      const data = await api.get<Consultation[]>("/admin/consultations");
      setConsultations(data);
    } catch (e) {
      console.error(e);
      showToast("相談トピックの取得に失敗しました", "error");
    }
  }, [showToast]);

  const fetchBanner = useCallback(async () => {
    try {
      const data = await api.get<BannerSettings>("/admin/banner-settings");
      setBanner(data);
    } catch (e) {
      console.error(e);
      showToast("バナー設定の取得に失敗しました", "error");
    }
  }, [showToast]);

  useEffect(() => {
    Promise.all([fetchPickupShops(), fetchConsultations(), fetchBanner()])
      .finally(() => setLoading(false));
  }, [fetchPickupShops, fetchConsultations, fetchBanner]);

  const tabs: { key: Tab; label: string; icon: typeof Star; count?: number }[] = [
    { key: "pickup", label: "ピックアップ店舗", icon: Crown, count: pickupShops.filter(s => s.visible).length },
    { key: "consultations", label: "みんなの相談", icon: MessageCircle, count: consultations.length },
    { key: "banner", label: "バナー・ヒーロー", icon: Image },
  ];

  const movePickupShop = async (id: number, direction: "up" | "down") => {
    const idx = pickupShops.findIndex(s => s.id === id);
    if (direction === "up" && idx > 0) {
      const next = [...pickupShops];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      setPickupShops(next);
      try {
        await api.post("/admin/pickup-shops/reorder", { ids: next.map(s => s.id) });
        showToast("並び順を更新しました");
      } catch (e) {
        console.error(e);
        showToast("並び順の更新に失敗しました", "error");
        await fetchPickupShops();
      }
    } else if (direction === "down" && idx < pickupShops.length - 1) {
      const next = [...pickupShops];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setPickupShops(next);
      try {
        await api.post("/admin/pickup-shops/reorder", { ids: next.map(s => s.id) });
        showToast("並び順を更新しました");
      } catch (e) {
        console.error(e);
        showToast("並び順の更新に失敗しました", "error");
        await fetchPickupShops();
      }
    }
  };

  const handleTogglePickupPr = async (shop: PickupShop) => {
    try {
      await api.put(`/admin/pickup-shops/${shop.id}`, { is_pr: !shop.is_pr });
      await fetchPickupShops();
      showToast(shop.is_pr ? "PRを解除しました" : "PRに設定しました");
    } catch (e) {
      console.error(e);
      showToast("PR設定の変更に失敗しました", "error");
    }
  };

  const handleTogglePickupVisible = async (shop: PickupShop) => {
    try {
      await api.put(`/admin/pickup-shops/${shop.id}`, { visible: !shop.visible });
      await fetchPickupShops();
      showToast(shop.visible ? "非表示にしました" : "表示にしました");
    } catch (e) {
      console.error(e);
      showToast("表示状態の変更に失敗しました", "error");
    }
  };

  const handleDeletePickupShop = async (shop: PickupShop) => {
    if (!confirm(`「${shop.store.name}」をピックアップから削除しますか？`)) return;
    try {
      await api.delete(`/admin/pickup-shops/${shop.id}`);
      await fetchPickupShops();
      showToast(`「${shop.store.name}」を削除しました`);
    } catch (e) {
      console.error(e);
      showToast("削除に失敗しました", "error");
    }
  };

  const handleSearchStores = async (query: string) => {
    setStoreSearch(query);
    if (query.length < 2) {
      setStoreResults([]);
      return;
    }
    setSearchingStores(true);
    try {
      const res = await api.get<{ data: Store[] }>(`/admin/stores?search=${encodeURIComponent(query)}&per_page=10`);
      setStoreResults(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingStores(false);
    }
  };

  const handleAddPickupShop = async (storeId: number) => {
    setSaving(true);
    try {
      await api.post("/admin/pickup-shops", { store_id: storeId, visible: true, is_pr: false });
      await fetchPickupShops();
      setShowAddPickupModal(false);
      setStoreSearch("");
      setStoreResults([]);
      showToast("ピックアップ店舗を追加しました");
    } catch (e) {
      console.error(e);
      showToast("追加に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleConsultationVisible = async (item: Consultation) => {
    try {
      await api.put(`/admin/consultations/${item.id}`, { visible: !item.visible });
      await fetchConsultations();
      showToast(item.visible ? "非表示にしました" : "表示にしました");
    } catch (e) {
      console.error(e);
      showToast("表示状態の変更に失敗しました", "error");
    }
  };

  const handleDeleteConsultation = async (item: Consultation) => {
    if (!confirm(`「${item.question}」を削除しますか？`)) return;
    try {
      await api.delete(`/admin/consultations/${item.id}`);
      await fetchConsultations();
      showToast("トピックを削除しました");
    } catch (e) {
      console.error(e);
      showToast("削除に失敗しました", "error");
    }
  };

  const handleAddConsultation = async () => {
    if (!newQuestion.trim()) return;
    setSaving(true);
    try {
      await api.post("/admin/consultations", {
        question: newQuestion,
        tag: newTag || "#相談",
        count: newCount,
        visible: true,
      });
      await fetchConsultations();
      setShowAddConsultationModal(false);
      setNewQuestion("");
      setNewTag("");
      setNewCount(0);
      showToast("トピックを追加しました");
    } catch (e) {
      console.error(e);
      showToast("追加に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateConsultation = async () => {
    if (!editingConsultation) return;
    setSaving(true);
    try {
      await api.put(`/admin/consultations/${editingConsultation.id}`, {
        question: editingConsultation.question,
        tag: editingConsultation.tag,
        count: editingConsultation.count,
      });
      await fetchConsultations();
      setEditingConsultation(null);
      showToast("トピックを更新しました");
    } catch (e) {
      console.error(e);
      showToast("更新に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBanner = async () => {
    setSaving(true);
    try {
      await api.put("/admin/banner-settings", banner);
      setEditingBanner(false);
      showToast("バナー設定を保存しました");
    } catch (e) {
      console.error(e);
      showToast("保存に失敗しました", "error");
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
      <div>
        <h2 className="text-xl text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
          コンテンツ管理
        </h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          ユーザー向けトップページの表示コンテンツを管理します
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-gray-900 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {/* ピックアップ店舗 */}
        {activeTab === "pickup" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">
                トップページの「ピックアップ店舗」セクションに表示する店舗とその順番を管理します。PRバッジ付きの店舗はゴールドのPRタグが表示されます。
              </p>
              <button
                onClick={() => setShowAddPickupModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] hover:bg-gray-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                店舗を追加
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider w-12">順</th>
                      <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider">店舗名</th>
                      <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider">エリア</th>
                      <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider">カテゴリ</th>
                      <th className="px-4 py-3 text-left text-[11px] text-muted-foreground uppercase tracking-wider">評価</th>
                      <th className="px-4 py-3 text-center text-[11px] text-muted-foreground uppercase tracking-wider">PR</th>
                      <th className="px-4 py-3 text-center text-[11px] text-muted-foreground uppercase tracking-wider">表示</th>
                      <th className="px-4 py-3 text-right text-[11px] text-muted-foreground uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickupShops.map((shop, idx) => (
                      <tr key={shop.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
                            <span className="text-[13px] text-muted-foreground">{idx + 1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-foreground">{shop.store.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] text-muted-foreground">{shop.store.area}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">{shop.store.category || "未設定"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-[13px] text-foreground">{shop.average_rating ?? "-"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleTogglePickupPr(shop)}
                            className={`text-[11px] px-2.5 py-1 rounded-md transition ${
                              shop.is_pr
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            PR
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleTogglePickupVisible(shop)}
                            className="text-muted-foreground hover:text-foreground transition"
                          >
                            {shop.visible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => movePickupShop(shop.id, "up")}
                              disabled={idx === 0}
                              className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition disabled:opacity-30"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => movePickupShop(shop.id, "down")}
                              disabled={idx === pickupShops.length - 1}
                              className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition disabled:opacity-30"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePickupShop(shop)}
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pickupShops.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                          ピックアップ店舗が登録されていません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* みんなの相談 */}
        {activeTab === "consultations" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">
                「みんなの相談」セクションに表示するトレンド相談トピックを管理します。AIがリアルタイム分析した結果として表示されます。
              </p>
              <button
                onClick={() => setShowAddConsultationModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] hover:bg-gray-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                トピック追加
              </button>
            </div>

            <div className="grid gap-3">
              {consultations.map((item) => (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-gray-300 transition">
                  <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-foreground">{item.question}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-[12px] text-pink-500">
                        <Hash className="w-3 h-3" />
                        {item.tag.replace("#", "")}
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {item.count >= 1000 ? `${(item.count / 1000).toFixed(1)}k` : item.count}件の相談
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleConsultationVisible(item)}
                    >
                      {item.visible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                    </button>
                    <button
                      onClick={() => setEditingConsultation({ ...item })}
                      className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConsultation(item)}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {consultations.length === 0 && (
                <div className="text-center py-8 text-[13px] text-muted-foreground">
                  相談トピックが登録されていません
                </div>
              )}
            </div>
          </div>
        )}

        {/* バナー・ヒーロー */}
        {activeTab === "banner" && (
          <div className="space-y-4">
            <p className="text-[13px] text-muted-foreground">
              トップページのヒーローセクションに表示されるテキストとバッジを管理します。
            </p>

            {/* Preview */}
            <div className="bg-gradient-to-br from-[#1b2528] to-[#0d1416] rounded-xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-3 py-1 rounded-full border border-amber-500/40 text-amber-300/90 tracking-widest" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {banner.hero_ai_label}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] px-2.5 py-1 bg-pink-500/85 text-white rounded-md tracking-wider">
                    {banner.hero_badge}
                  </span>
                </div>
                <h1 className="text-4xl text-white tracking-wide" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
                  Recta<span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 ml-1 mb-1" />
                </h1>
                <p className="text-[15px] text-white/95 tracking-wider">{banner.hero_tagline}</p>
                <p className="text-[11px] text-amber-200/80 tracking-wider">{banner.hero_subtitle}</p>
              </div>
            </div>

            {/* Edit Form */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] text-foreground" style={{ fontWeight: 600 }}>ヒーロー設定</h3>
                {!editingBanner ? (
                  <button
                    onClick={() => setEditingBanner(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    編集
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingBanner(false); fetchBanner(); }}
                      className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-gray-500 hover:text-gray-700 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveBanner}
                      disabled={saving}
                      className="flex items-center gap-1 px-3 py-1.5 text-[13px] bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      保存
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] text-muted-foreground mb-1.5">タグライン</label>
                  <input
                    type="text"
                    value={banner.hero_tagline}
                    onChange={(e) => setBanner(prev => ({ ...prev, hero_tagline: e.target.value }))}
                    disabled={!editingBanner}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background disabled:bg-muted/30 disabled:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-muted-foreground mb-1.5">サブタイトル</label>
                  <input
                    type="text"
                    value={banner.hero_subtitle}
                    onChange={(e) => setBanner(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                    disabled={!editingBanner}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background disabled:bg-muted/30 disabled:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-muted-foreground mb-1.5">バッジテキスト</label>
                  <input
                    type="text"
                    value={banner.hero_badge}
                    onChange={(e) => setBanner(prev => ({ ...prev, hero_badge: e.target.value }))}
                    disabled={!editingBanner}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background disabled:bg-muted/30 disabled:text-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-muted-foreground mb-1.5">AIラベル</label>
                  <input
                    type="text"
                    value={banner.hero_ai_label}
                    onChange={(e) => setBanner(prev => ({ ...prev, hero_ai_label: e.target.value }))}
                    disabled={!editingBanner}
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background disabled:bg-muted/30 disabled:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-[12px] text-gray-500">
                  ※ ヒーロー背景画像はコードで管理しています。変更が必要な場合は開発チームにご連絡ください。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Pickup Shop Modal */}
      {showAddPickupModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>ピックアップ店舗を追加</h3>
              <button onClick={() => { setShowAddPickupModal(false); setStoreSearch(""); setStoreResults([]); }} className="p-1 rounded hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">店舗を検索</label>
              <input
                type="text"
                value={storeSearch}
                onChange={(e) => handleSearchStores(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background"
                placeholder="店舗名で検索..."
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {searchingStores && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {storeResults.map(store => {
                const alreadyAdded = pickupShops.some(s => s.store_id === store.id);
                return (
                  <button
                    key={store.id}
                    onClick={() => !alreadyAdded && handleAddPickupShop(store.id)}
                    disabled={alreadyAdded || saving}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition ${
                      alreadyAdded
                        ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                        : "hover:bg-gray-50 text-foreground"
                    }`}
                  >
                    <p className="text-[13px]">{store.name}</p>
                    <p className="text-[11px] text-muted-foreground">{store.area} {store.category && `/ ${store.category}`}</p>
                    {alreadyAdded && <span className="text-[11px] text-amber-500">追加済み</span>}
                  </button>
                );
              })}
              {storeSearch.length >= 2 && !searchingStores && storeResults.length === 0 && (
                <p className="text-center text-[13px] text-muted-foreground py-4">店舗が見つかりません</p>
              )}
              {storeSearch.length < 2 && (
                <p className="text-center text-[13px] text-muted-foreground py-4">2文字以上入力して検索してください</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Consultation Modal */}
      {showAddConsultationModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>相談トピックを追加</h3>
              <button onClick={() => setShowAddConsultationModal(false)} className="p-1 rounded hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">質問</label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background"
                  placeholder="未経験でも大丈夫ですか？"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">タグ</label>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background"
                  placeholder="#未経験"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">相談件数</label>
                <input
                  type="number"
                  value={newCount}
                  onChange={(e) => setNewCount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background"
                  min={0}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddConsultationModal(false)}
                className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddConsultation}
                disabled={saving || !newQuestion.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Consultation Modal */}
      {editingConsultation && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] text-foreground" style={{ fontWeight: 600 }}>相談トピックを編集</h3>
              <button onClick={() => setEditingConsultation(null)} className="p-1 rounded hover:bg-gray-100 transition">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">質問</label>
                <input
                  type="text"
                  value={editingConsultation.question}
                  onChange={(e) => setEditingConsultation(prev => prev ? { ...prev, question: e.target.value } : null)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">タグ</label>
                <input
                  type="text"
                  value={editingConsultation.tag}
                  onChange={(e) => setEditingConsultation(prev => prev ? { ...prev, tag: e.target.value } : null)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">相談件数</label>
                <input
                  type="number"
                  value={editingConsultation.count}
                  onChange={(e) => setEditingConsultation(prev => prev ? { ...prev, count: parseInt(e.target.value) || 0 } : null)}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background"
                  min={0}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingConsultation(null)}
                className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdateConsultation}
                disabled={saving || !editingConsultation.question.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
