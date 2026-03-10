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
} from "lucide-react";
import { api } from "~/lib/api";

interface PickupShopItem {
  id: number;
  store_id: number;
  sort_order: number;
  is_pr: boolean;
  visible: boolean;
  store: {
    id: number;
    name: string;
    area: string;
    category: string | null;
  };
  average_rating: number | null;
}

interface ConsultationItem {
  id: number;
  question: string;
  tag: string;
  count: number;
  visible: boolean;
  sort_order: number;
}

interface BannerSettings {
  hero_tagline: string;
  hero_subtitle: string;
  hero_badge: string;
  hero_ai_label: string;
}

type Tab = "pickup" | "consultations" | "banner";

export function ContentManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pickup");
  const [pickupShops, setPickupShops] = useState<PickupShopItem[]>([]);
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [banner, setBanner] = useState<BannerSettings>({ hero_tagline: "", hero_subtitle: "", hero_badge: "", hero_ai_label: "" });
  const [editingBanner, setEditingBanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPickupShops = useCallback(async () => {
    const data = await api.get<PickupShopItem[]>("/admin/pickup-shops");
    setPickupShops(data);
  }, []);

  const fetchConsultations = useCallback(async () => {
    const data = await api.get<ConsultationItem[]>("/admin/consultations");
    setConsultations(data);
  }, []);

  const fetchBanner = useCallback(async () => {
    const data = await api.get<BannerSettings>("/admin/banner-settings");
    setBanner(data);
  }, []);

  useEffect(() => {
    Promise.all([fetchPickupShops(), fetchConsultations(), fetchBanner()])
      .catch(console.error)
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
      await api.post("/admin/pickup-shops/reorder", { ids: next.map(s => s.id) });
    } else if (direction === "down" && idx < pickupShops.length - 1) {
      const next = [...pickupShops];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      setPickupShops(next);
      await api.post("/admin/pickup-shops/reorder", { ids: next.map(s => s.id) });
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
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] hover:bg-gray-800 transition">
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
                    {pickupShops.map((shop) => (
                      <tr key={shop.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
                            <span className="text-[13px] text-muted-foreground">{pickupShops.indexOf(shop) + 1}</span>
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
                            <span className="text-[13px] text-foreground">{shop.average_rating}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => api.put(`/admin/pickup-shops/${shop.id}`, { is_pr: !shop.is_pr }).then(fetchPickupShops)}
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
                            onClick={() => api.put(`/admin/pickup-shops/${shop.id}`, { visible: !shop.visible }).then(fetchPickupShops)}
                            className="text-muted-foreground hover:text-foreground transition"
                          >
                            {shop.visible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => movePickupShop(shop.id, "up")}
                              className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => movePickupShop(shop.id, "down")}
                              className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => api.delete(`/admin/pickup-shops/${shop.id}`).then(fetchPickupShops)}
                              className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => api.post("/admin/pickup-shops/reorder", { ids: pickupShops.map(s => s.id) })}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px] hover:bg-gray-800 transition"
              >
                <Save className="w-3.5 h-3.5" />
                並び順を保存
              </button>
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
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[13px] hover:bg-gray-800 transition">
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
                      onClick={() => api.put(`/admin/consultations/${item.id}`, { visible: !item.visible }).then(fetchConsultations)}
                    >
                      {item.visible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-300" />}
                    </button>
                    <button className="p-1 rounded hover:bg-gray-100 text-muted-foreground transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => api.delete(`/admin/consultations/${item.id}`).then(fetchConsultations)}
                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
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
                      onClick={() => setEditingBanner(false)}
                      className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-gray-500 hover:text-gray-700 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      キャンセル
                    </button>
                    <button
                      onClick={() => api.put("/admin/banner-settings", banner).then(() => setEditingBanner(false))}
                      className="flex items-center gap-1 px-3 py-1.5 text-[13px] bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                    >
                      <Save className="w-3.5 h-3.5" />
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
    </div>
  );
}
