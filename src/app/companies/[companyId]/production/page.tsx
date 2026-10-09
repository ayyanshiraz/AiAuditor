"use client";

import { useState } from "react";
import { Factory, Settings, ListOrdered, FileBox, Activity, CheckCircle, AlertTriangle, Clock, Plus, Filter, Edit, Trash2, X, Save, ArrowRight, BarChart3, Wrench, HardHat, Cog, TrendingUp, Users } from "lucide-react";

// --- Types ---
type OrderStatus = "Draft" | "Planned" | "Released" | "Material Issued" | "In Production" | "QC" | "Completed" | "Closed";

type ProductionOrder = {
  id: string; orderNumber: string; product: string; bom: string; recipe: string; plannedQty: string;
  startDate: string; dueDate: string; warehouse: string; priority: string; assignedTeam: string; status: OrderStatus;
  reqQty: string; resQty: string; consQty: string; remQty: string; matScrap: string;
  outPlanned: string; outProduced: string; outAccepted: string; outRejected: string; outRework: string; outScrap: string;
};

type BOMComponent = {
  name: string;
  qty: string;
  unit: string;
};

type BOM = {
  id: string; bomNumber: string; product: string; partNumber: string; version: string;
  components: BOMComponent[]; scrapPct: string; wastagePct: string;
  effectiveDate: string; expiryDate: string; status: string; approvedBy: string;
};

type RecipeOperation = {
  sequence: string;
  name: string;
  machine: string;
  time: string;
  operator: string;
  input: string;
  output: string;
  qcReq: string;
};

type Recipe = {
  id: string; recipeId: string; product: string; version: string; batchSize: string;
  rawMaterial: string; inputQty: string; expectedOutput: string; expectedScrap: string;
  operations: RecipeOperation[];
  machine: string; workCenter: string; stdTime: string; labourTime: string; setupTime: string;
  qcParams: string; inspectionReqs: string; effectiveDate: string; approvedBy: string;
};

// --- Initial Data ---
const initialOrders: ProductionOrder[] = [
  {
    id: "1", orderNumber: "PRD-2026-001", product: "Oil Pump Assembly", bom: "BOM-OP-001", recipe: "REC-OP-001", plannedQty: "500",
    startDate: "2026-10-10", dueDate: "2026-10-15", warehouse: "WH-1", priority: "High", assignedTeam: "Team Alpha", status: "In Production",
    reqQty: "500", resQty: "500", consQty: "250", remQty: "250", matScrap: "5",
    outPlanned: "500", outProduced: "245", outAccepted: "240", outRejected: "3", outRework: "2", outScrap: "0"
  },
  {
    id: "2", orderNumber: "PRD-2026-002", product: "Master Cylinder", bom: "BOM-MC-102", recipe: "REC-MC-102", plannedQty: "150",
    startDate: "2026-10-12", dueDate: "2026-10-18", warehouse: "WH-2", priority: "Normal", assignedTeam: "Team Beta", status: "Planned",
    reqQty: "150", resQty: "150", consQty: "0", remQty: "150", matScrap: "0",
    outPlanned: "150", outProduced: "0", outAccepted: "0", outRejected: "0", outRework: "0", outScrap: "0"
  }
];

const initialBOMs: BOM[] = [
  {
    id: "b1", bomNumber: "BOM-OP-001", product: "Oil Pump Assembly", partNumber: "OPA-100", version: "v1.2",
    components: [
      { name: "Oil Pump Housing", qty: "1", unit: "Pcs" },
      { name: "Pump Gear", qty: "2", unit: "Pcs" },
      { name: "Drive Shaft", qty: "1", unit: "Pcs" },
      { name: "Relief Valve", qty: "1", unit: "Pcs" },
      { name: "Spring", qty: "1", unit: "Pcs" },
      { name: "Seal", qty: "2", unit: "Pcs" },
      { name: "O-Ring", qty: "1", unit: "Pcs" },
      { name: "Bolts", qty: "6", unit: "Pcs" }
    ],
    scrapPct: "2%", wastagePct: "1%", effectiveDate: "2026-01-01", expiryDate: "2027-12-31", status: "Active", approvedBy: "Eng. Yasir"
  }
];

const initialRecipes: Recipe[] = [
  {
    id: "r1", recipeId: "REC-EV-001", product: "Engine Valve", version: "v2.0", batchSize: "1000",
    rawMaterial: "Steel Alloy Rods", inputQty: "1050", expectedOutput: "1000", expectedScrap: "4.7%",
    operations: [
      { sequence: "1", name: "Cutting", machine: "Saw", time: "2m", operator: "Op-1", input: "1050", output: "1050", qcReq: "Visual" },
      { sequence: "2", name: "Forging", machine: "Press", time: "5m", operator: "Op-2", input: "1050", output: "1040", qcReq: "Dimension Check" },
      { sequence: "3", name: "Heat Treatment", machine: "Oven", time: "60m", operator: "Op-3", input: "1040", output: "1040", qcReq: "Hardness Test" },
      { sequence: "4", name: "Grinding", machine: "Grinder", time: "10m", operator: "Op-4", input: "1040", output: "1020", qcReq: "Surface Finish" },
      { sequence: "5", name: "Finishing", machine: "Polisher", time: "5m", operator: "Op-5", input: "1020", output: "1010", qcReq: "Visual" },
      { sequence: "6", name: "QC", machine: "CMM", time: "3m", operator: "QA-1", input: "1010", output: "1000", qcReq: "Tolerance +/- 0.01mm" }
    ],
    machine: "Multiple", workCenter: "WC-A", stdTime: "85m", labourTime: "40m", setupTime: "15m",
    qcParams: "Tolerance +/- 0.01mm", inspectionReqs: "Micrometer Check 100%", effectiveDate: "2026-05-01", approvedBy: "QA Ayan"
  }
];

const emptyOrder: Omit<ProductionOrder, "id"> = { orderNumber: "", product: "", bom: "", recipe: "", plannedQty: "", startDate: "", dueDate: "", warehouse: "", priority: "Normal", assignedTeam: "", status: "Draft", reqQty: "", resQty: "", consQty: "", remQty: "", matScrap: "", outPlanned: "", outProduced: "", outAccepted: "", outRejected: "", outRework: "", outScrap: "" };
const emptyBOM: Omit<BOM, "id"> = { bomNumber: "", product: "", partNumber: "", version: "", components: [{ name: "", qty: "", unit: "Pcs" }], scrapPct: "", wastagePct: "", effectiveDate: "", expiryDate: "", status: "Draft", approvedBy: "" };
const emptyRecipe: Omit<Recipe, "id"> = { recipeId: "", product: "", version: "", batchSize: "", rawMaterial: "", inputQty: "", expectedOutput: "", expectedScrap: "", operations: [{ sequence: "1", name: "", machine: "", time: "", operator: "", input: "", output: "", qcReq: "" }], machine: "", workCenter: "", stdTime: "", labourTime: "", setupTime: "", qcParams: "", inspectionReqs: "", effectiveDate: "", approvedBy: "" };

export default function ProductionDashboard() {
  const [activeTab, setActiveTab] = useState("recipe");

  // State: Orders
  const [orders, setOrders] = useState<ProductionOrder[]>(initialOrders);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<Omit<ProductionOrder, "id">>(emptyOrder);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // State: BOMs
  const [boms, setBoms] = useState<BOM[]>(initialBOMs);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [bomForm, setBomForm] = useState<Omit<BOM, "id">>(emptyBOM);
  const [editingBomId, setEditingBomId] = useState<string | null>(null);

  // State: Recipes
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeForm, setRecipeForm] = useState<Omit<Recipe, "id">>(emptyRecipe);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  // --- Handlers: Orders ---
  const openOrderModal = (order?: ProductionOrder) => {
    if (order) { setOrderForm(order); setEditingOrderId(order.id); } else { setOrderForm(emptyOrder); setEditingOrderId(null); }
    setIsOrderModalOpen(true);
  };
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrderId) setOrders(orders.map(o => o.id === editingOrderId ? { ...orderForm, id: editingOrderId } : o));
    else setOrders([{ ...orderForm, id: Date.now().toString() }, ...orders]);
    setIsOrderModalOpen(false);
  };
  const handleDeleteOrder = (id: string) => { if (confirm("Delete this production order?")) setOrders(orders.filter(o => o.id !== id)); };

  // --- Handlers: BOMs ---
  const openBomModal = (bom?: BOM) => {
    if (bom) { setBomForm(bom); setEditingBomId(bom.id); } else { setBomForm(emptyBOM); setEditingBomId(null); }
    setIsBomModalOpen(true);
  };
  const handleSaveBom = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBomId) setBoms(boms.map(b => b.id === editingBomId ? { ...bomForm, id: editingBomId } as BOM : b));
    else setBoms([{ ...bomForm, id: Date.now().toString() } as BOM, ...boms]);
    setIsBomModalOpen(false);
  };
  const handleDeleteBom = (id: string) => { if (confirm("Delete this Bill of Materials?")) setBoms(boms.filter(b => b.id !== id)); };

  // --- Handlers: Recipes ---
  const openRecipeModal = (recipe?: Recipe) => {
    if (recipe) { setRecipeForm(recipe); setEditingRecipeId(recipe.id); } else { setRecipeForm(emptyRecipe); setEditingRecipeId(null); }
    setIsRecipeModalOpen(true);
  };
  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecipeId) setRecipes(recipes.map(r => r.id === editingRecipeId ? { ...recipeForm, id: editingRecipeId } as Recipe : r));
    else setRecipes([{ ...recipeForm, id: Date.now().toString() } as Recipe, ...recipes]);
    setIsRecipeModalOpen(false);
  };
  const handleDeleteRecipe = (id: string) => { if (confirm("Delete this Recipe?")) setRecipes(recipes.filter(r => r.id !== id)); };

  // Workflow Utilities
  const getOrderWorkflowIndex = (status: string) => {
    switch(status) {
      case "Draft": return 0;
      case "Planned": return 1;
      case "Released": return 2;
      case "Material Issued": return 3;
      case "In Production": return 4;
      case "QC": return 5;
      case "Completed": return 6;
      case "Closed": return 7;
      default: return -1;
    }
  };
  const workflowSteps = ["Draft", "Planned", "Released", "Mat. Issued", "In Prod", "QC", "Completed", "Closed"];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden relative">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 bg-white flex flex-col flex-shrink-0 z-20">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <a href="." className="text-gray-500 hover:text-gray-900 transition-colors text-xs font-semibold uppercase tracking-wider mb-4 md:mb-6 flex items-center gap-2">
            ← Back to Modules
          </a>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Factory className="h-5 w-5 text-orange-600" /> Production
          </h2>
        </div>
        
        <nav className="flex overflow-x-auto md:flex-col md:flex-1 p-4 gap-2 md:gap-0 md:space-y-1 md:overflow-y-auto custom-scrollbar">
          <SidebarButton id="dashboard" active={activeTab} onClick={setActiveTab} icon={<BarChart3 className="h-4 w-4 shrink-0" />} label="Dashboard" />
          <SidebarButton id="orders" active={activeTab} onClick={setActiveTab} icon={<HardHat className="h-4 w-4 shrink-0" />} label="Production Orders" />
          <SidebarButton id="bom" active={activeTab} onClick={setActiveTab} icon={<ListOrdered className="h-4 w-4 shrink-0" />} label="Bill of Materials (BOM)" />
          <SidebarButton id="recipe" active={activeTab} onClick={setActiveTab} icon={<Cog className="h-4 w-4 shrink-0" />} label="Manufacturing Recipes" />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto pb-12">

          {/* --- DASHBOARD TAB --- */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manufacturing Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">Real-time metrics for factory operations, output, and efficiency.</p>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Planned Production" value="12" icon={<Clock className="h-5 w-5 text-blue-600" />} />
                <StatCard title="In Production" value="8" icon={<Cog className="h-5 w-5 text-orange-600" />} />
                <StatCard title="Completed" value="45" icon={<CheckCircle className="h-5 w-5 text-green-600" />} />
                <StatCard title="Pending" value="5" icon={<Clock className="h-5 w-5 text-gray-500" />} />
                <StatCard title="Delayed" value="2" icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />} alert />
                
                <StatCard title="WIP (Work In Progress)" value="PKR 1.2M" icon={<Activity className="h-5 w-5 text-purple-600" />} />
                <StatCard title="Production Cost" value="PKR 4.5M" icon={<Activity className="h-5 w-5 text-emerald-600" />} />
                <StatCard title="Scrap Output" value="2.4%" icon={<Trash2 className="h-5 w-5 text-red-600" />} alert />
                <StatCard title="Rejected Units" value="1.1%" icon={<X className="h-5 w-5 text-red-600" />} alert />
                <StatCard title="Production Efficiency" value="92.5%" icon={<TrendingUp className="h-5 w-5 text-cyan-600" />} />
              </div>

              {/* Charts & Graphs Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Production Output Bar Chart */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orange-600" /> Production Output Trend
                    </h2>
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">+6.8% Efficiency</span>
                  </div>
                  <div className="flex items-end justify-between h-48 gap-2 mt-4 pt-6 border-b border-gray-200 pb-2">
                    {[
                      { month: "May", height: "40%", val: "2,100" }, { month: "Jun", height: "55%", val: "2,800" },
                      { month: "Jul", height: "45%", val: "2,400" }, { month: "Aug", height: "70%", val: "3,200" },
                      { month: "Sep", height: "85%", val: "3,800" }, { month: "Oct", height: "95%", val: "4,100" },
                    ].map((bar, i) => (
                      <div key={i} className="flex flex-col items-center w-full h-full group">
                        <div className="w-full relative flex justify-center h-full items-end">
                          <span className="absolute -top-8 text-xs font-semibold text-gray-900 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity bg-white border border-gray-200 shadow-md px-2 py-1 rounded">{bar.val}</span>
                          <div className="w-full max-w-[3rem] bg-orange-100 hover:bg-orange-500 rounded-t-sm transition-all duration-300" style={{ height: bar.height }}></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-3">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 2: Status Distribution Graph */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <Activity className="h-5 w-5 text-blue-600" /> Current Production Status
                  </h2>
                  <div className="space-y-6">
                    {/* Stacked Progress Bar */}
                    <div className="w-full h-8 flex rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                      <div className="h-full bg-green-500" style={{ width: "60%" }} title="Completed"></div>
                      <div className="h-full bg-orange-500" style={{ width: "20%" }} title="In Production"></div>
                      <div className="h-full bg-blue-500" style={{ width: "10%" }} title="Planned"></div>
                      <div className="h-full bg-yellow-500" style={{ width: "6%" }} title="QC Inspect"></div>
                      <div className="h-full bg-red-500" style={{ width: "4%" }} title="Delayed"></div>
                    </div>
                    {/* Distribution Legend & Values */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <DistributionItem color="bg-green-500" label="Completed" value="60%" count="45 Orders" />
                      <DistributionItem color="bg-orange-500" label="In Prod" value="20%" count="8 Orders" />
                      <DistributionItem color="bg-blue-500" label="Planned" value="10%" count="12 Orders" />
                      <DistributionItem color="bg-yellow-500" label="QC Inspect" value="6%" count="3 Orders" />
                      <DistributionItem color="bg-gray-400" label="Pending" value="0%" count="5 Orders" />
                      <DistributionItem color="bg-red-500" label="Delayed" value="4%" count="2 Orders" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Flowchart */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 overflow-x-auto">
                <h2 className="text-lg font-bold text-gray-900 mb-8">Production Lifecycle Workflow</h2>
                <div className="flex items-center justify-between min-w-[1000px] py-4">
                  <WorkflowNode title="Draft" color="gray" /> <WorkflowArrow />
                  <WorkflowNode title="Planned" color="blue" /> <WorkflowArrow />
                  <WorkflowNode title="Released" color="cyan" /> <WorkflowArrow />
                  <WorkflowNode title="Material Issued" color="purple" /> <WorkflowArrow />
                  <WorkflowNode title="In Production" color="orange" /> <WorkflowArrow />
                  <WorkflowNode title="QC Inspect" color="yellow" /> <WorkflowArrow />
                  <WorkflowNode title="Completed" color="emerald" /> <WorkflowArrow />
                  <WorkflowNode title="Closed" color="gray" />
                </div>
              </div>
            </div>
          )}

          {/* --- PRODUCTION ORDERS TAB --- */}
          {activeTab === "orders" && (
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Production Orders Ledger</h2>
                  <p className="text-gray-500 text-sm mt-1">Manage active manufacturing jobs, material consumption, output metrics, and live status routing.</p>
                </div>
                <div className="flex gap-3">
                  <button className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 text-sm border border-gray-300 shadow-sm">
                    <Filter className="h-4 w-4" /> Filter
                  </button>
                  <button onClick={() => openOrderModal()} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm shadow-sm">
                    <Plus className="h-4 w-4" /> New Production Order
                  </button>
                </div>
              </div>
              
              <div className="overflow-auto flex-1 rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-left text-sm text-gray-700 whitespace-nowrap">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-4 font-medium">Order Details</th>
                      <th className="px-4 py-4 font-medium">BOM / Recipe</th>
                      <th className="px-4 py-4 font-medium">Consumption & Output</th>
                      <th className="px-4 py-4 font-medium">Schedule & Team</th>
                      <th className="px-4 py-4 font-medium">Status & Workflow</th>
                      <th className="px-4 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No production orders found.</td></tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-4 py-4">
                            <div className="font-bold text-gray-900 text-base">{order.orderNumber}</div>
                            <div className="text-orange-600 font-medium mt-1">{order.product}</div>
                            <div className="text-xs text-gray-500 mt-1">Priority: <span className={order.priority === "High" ? "text-red-600" : "text-gray-500"}>{order.priority}</span></div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2"><ListOrdered className="h-3.5 w-3.5 text-gray-400" /> <span className="font-mono text-gray-700">{order.bom}</span></div>
                            <div className="flex items-center gap-2 mt-2"><Cog className="h-3.5 w-3.5 text-gray-400" /> <span className="font-mono text-gray-700">{order.recipe}</span></div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs mb-1"><span className="text-gray-500">Mat Used:</span> <span className="text-blue-600">{order.consQty}</span> / {order.reqQty}</div>
                            <div className="text-xs mb-2"><span className="text-gray-500">Scrap:</span> <span className="text-red-600">{order.matScrap}</span> Units</div>
                            
                            <div className="text-xs"><span className="text-gray-500">Output:</span> <span className="text-green-600 font-bold text-sm">{order.outProduced}</span> / {order.plannedQty}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">Acc: {order.outAccepted} | Rej: {order.outRejected} | Rew: {order.outRework}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div><span className="text-gray-500 text-xs">Start:</span> {order.startDate}</div>
                            <div className="mt-1"><span className="text-gray-500 text-xs">Due:</span> {order.dueDate}</div>
                            <div className="text-xs text-blue-600 mt-2 flex items-center gap-1"><Users className="h-3 w-3"/> {order.assignedTeam}</div>
                          </td>
                          <td className="px-4 py-4 min-w-[280px]">
                            <div className="mb-3">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${order.status === "In Production" ? "bg-orange-50 text-orange-700 border-orange-200" : order.status === "Completed" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 w-full">
                              {workflowSteps.map((step, idx) => {
                                const currentStepIdx = getOrderWorkflowIndex(order.status);
                                const isActive = currentStepIdx !== -1 && idx <= currentStepIdx;
                                return (
                                  <div key={step} className="flex-1 flex flex-col gap-1" title={step}>
                                    <div className={`h-1.5 w-full rounded-full ${isActive ? "bg-orange-500" : "bg-gray-200"}`}></div>
                                    <span className={`text-[9px] font-medium text-center ${isActive ? "text-orange-600" : "text-gray-400"}`}>{step}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openOrderModal(order)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-orange-50 text-gray-600 hover:text-orange-600 rounded" title="Edit Order"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => handleDeleteOrder(order.id)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded" title="Delete Order"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- BOM TAB --- */}
          {activeTab === "bom" && (
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Bill of Materials (BOM)</h2>
                  <p className="text-gray-500 text-sm mt-1">Define the raw materials and precise component quantities required for finished products.</p>
                </div>
                <button onClick={() => openBomModal()} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm shadow-sm">
                  <Plus className="h-4 w-4" /> Create BOM
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {boms.length === 0 ? (
                  <p className="text-gray-500 text-center py-12 bg-gray-50 rounded-xl border border-gray-200">No BOMs found. Click "Create BOM" to start building your product structure.</p>
                ) : (
                  boms.map((bom) => (
                    <div key={bom.id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 hover:border-gray-300 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 border-b border-gray-200 pb-5">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-gray-900">{bom.product}</h3>
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-700 rounded text-xs border border-gray-200">{bom.version}</span>
                            <span className={`px-2 py-0.5 rounded text-xs border ${bom.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{bom.status}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">BOM No: <span className="text-gray-700">{bom.bomNumber}</span> | Part: <span className="text-gray-700">{bom.partNumber}</span> | Approved By: <span className="text-gray-700">{bom.approvedBy}</span></p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openBomModal(bom)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded transition-colors" title="Edit BOM"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteBom(bom.id)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded transition-colors" title="Delete BOM"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider">Required Components</h4>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                          <table className="w-full text-left text-sm text-gray-700 whitespace-nowrap">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                               <tr>
                                 <th className="px-4 py-3 font-medium">Component / Material</th>
                                 <th className="px-4 py-3 font-medium text-right w-32">Required Qty</th>
                                 <th className="px-4 py-3 font-medium text-left w-24">Unit</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {bom.components.map((c, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-gray-900">{c.name}</td>
                                  <td className="px-4 py-3 text-right font-mono text-orange-600 font-bold">{c.qty}</td>
                                  <td className="px-4 py-3 text-left text-xs text-gray-500">{c.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                        <span className="flex items-center gap-2">Scrap Factor: <strong className="text-red-600">{bom.scrapPct}</strong></span>
                        <span className="flex items-center gap-2">Wastage: <strong className="text-yellow-600">{bom.wastagePct}</strong></span>
                        <span className="flex items-center gap-2">Effective: <strong className="text-gray-900">{bom.effectiveDate}</strong></span>
                        <span className="flex items-center gap-2">Expiry: <strong className="text-gray-900">{bom.expiryDate || 'N/A'}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* --- RECIPES TAB (FULLY FUNCTIONAL) --- */}
          {activeTab === "recipe" && (
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Manufacturing Recipes</h2>
                  <p className="text-gray-500 text-sm mt-1">Define sequence, machinery, operations, and QA parameters.</p>
                </div>
                <button onClick={() => openRecipeModal()} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm shadow-sm">
                  <Plus className="h-4 w-4" /> Create Recipe
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                {recipes.length === 0 ? (
                  <p className="text-gray-500 text-center py-12">No recipes found.</p>
                ) : (
                  recipes.map((recipe) => (
                    <div key={recipe.id} className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 hover:border-gray-300 transition-colors">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-4 border-b border-gray-200 pb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900">{recipe.product}</h3>
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-700 rounded text-xs border border-gray-200">{recipe.version}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">Recipe ID: {recipe.recipeId} | Work Center: {recipe.workCenter} | Approved: {recipe.approvedBy}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openRecipeModal(recipe)} className="p-1.5 bg-gray-50 border border-gray-200 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteRecipe(recipe.id)} className="p-1.5 bg-gray-50 border border-gray-200 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Input / Output</h4>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-700">
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Material:</span> <span>{recipe.rawMaterial}</span></div>
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Batch Size:</span> <span>{recipe.batchSize}</span></div>
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Input / Output:</span> <span>{recipe.inputQty} / {recipe.expectedOutput}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Expected Scrap %:</span> <span>{recipe.expectedScrap}</span></div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Standard Times & QC</h4>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-700">
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Setup Time:</span> <span>{recipe.setupTime}</span></div>
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Labour Time:</span> <span>{recipe.labourTime}</span></div>
                            <div className="flex justify-between mb-1"><span className="text-gray-500">Standard Time:</span> <span>{recipe.stdTime}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Overall QC Req:</span> <span className="truncate max-w-[150px]">{recipe.inspectionReqs}</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Operations Ledger */}
                      <div className="mt-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider">Operations Routing Sequence</h4>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                          <table className="w-full text-left text-sm text-gray-700 whitespace-nowrap">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                               <tr>
                                 <th className="px-4 py-3 font-medium w-16">Seq</th>
                                 <th className="px-4 py-3 font-medium">Operation</th>
                                 <th className="px-4 py-3 font-medium">Machine / Operator</th>
                                 <th className="px-4 py-3 font-medium text-center">Time</th>
                                 <th className="px-4 py-3 font-medium text-center">Input/Output</th>
                                 <th className="px-4 py-3 font-medium">QC Requirement</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {recipe.operations.map((op, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 font-mono text-gray-500">{op.sequence}</td>
                                  <td className="px-4 py-3 font-bold text-orange-600">{op.name}</td>
                                  <td className="px-4 py-3">
                                    <div className="text-gray-900">{op.machine}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Op: {op.operator}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center text-gray-700">{op.time}</td>
                                  <td className="px-4 py-3 text-center text-xs font-mono">
                                    <span className="text-blue-600">{op.input}</span> <span className="text-gray-400 mx-1">→</span> <span className="text-emerald-600">{op.output}</span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-normal max-w-[150px]">{op.qcReq}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Production Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingOrderId ? "Edit Production Order" : "Create Production Order"}</h2>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-gray-500 hover:text-gray-900"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSaveOrder} className="overflow-y-auto p-6 space-y-8 flex-1 custom-scrollbar">
              
              {/* General Order Details */}
              <div>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-4">1. Order Identity & Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField label="Production Order #" value={orderForm.orderNumber} onChange={(e: any) => setOrderForm({...orderForm, orderNumber: e.target.value})} required />
                  <InputField label="Part/Product Name" value={orderForm.product} onChange={(e: any) => setOrderForm({...orderForm, product: e.target.value})} required />
                  <InputField label="BOM Identifier" value={orderForm.bom} onChange={(e: any) => setOrderForm({...orderForm, bom: e.target.value})} required />
                  <InputField label="Recipe Identifier" value={orderForm.recipe} onChange={(e: any) => setOrderForm({...orderForm, recipe: e.target.value})} required />
                  <InputField label="Planned Quantity" type="number" value={orderForm.plannedQty} onChange={(e: any) => setOrderForm({...orderForm, plannedQty: e.target.value})} required />
                  <InputField label="Start Date" type="date" value={orderForm.startDate} onChange={(e: any) => setOrderForm({...orderForm, startDate: e.target.value})} required />
                  <InputField label="Due Date" type="date" value={orderForm.dueDate} onChange={(e: any) => setOrderForm({...orderForm, dueDate: e.target.value})} required />
                  <InputField label="Assigned Warehouse" value={orderForm.warehouse} onChange={(e: any) => setOrderForm({...orderForm, warehouse: e.target.value})} required />
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Order Priority</label>
                    <select value={orderForm.priority} onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 shadow-sm">
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs font-medium text-gray-600">Production Status</label>
                    <select value={orderForm.status} onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderStatus })} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 shadow-sm">
                      <option value="Draft">Draft</option>
                      <option value="Planned">Planned</option>
                      <option value="Released">Released</option>
                      <option value="Material Issued">Material Issued</option>
                      <option value="In Production">In Production</option>
                      <option value="QC">QC</option>
                      <option value="Completed">Completed</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <InputField label="Assigned Team" value={orderForm.assignedTeam} onChange={(e: any) => setOrderForm({...orderForm, assignedTeam: e.target.value})} />
                </div>
              </div>

              {/* Material Consumption */}
              <div className="p-5 border border-gray-200 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2"><ListOrdered className="h-4 w-4" /> 2. Material Consumption</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <InputField label="Required Quantity" type="number" value={orderForm.reqQty} onChange={(e: any) => setOrderForm({...orderForm, reqQty: e.target.value})} />
                  <InputField label="Reserved Quantity" type="number" value={orderForm.resQty} onChange={(e: any) => setOrderForm({...orderForm, resQty: e.target.value})} />
                  <InputField label="Consumed Quantity" type="number" value={orderForm.consQty} onChange={(e: any) => setOrderForm({...orderForm, consQty: e.target.value})} />
                  <InputField label="Remaining Quantity" type="number" value={orderForm.remQty} onChange={(e: any) => setOrderForm({...orderForm, remQty: e.target.value})} />
                  <InputField label="Scrap/Waste" type="number" value={orderForm.matScrap} onChange={(e: any) => setOrderForm({...orderForm, matScrap: e.target.value})} />
                </div>
              </div>

              {/* Production Output */}
              <div className="p-5 border border-gray-200 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-green-600 uppercase tracking-wider mb-4 flex items-center gap-2"><CheckCircle className="h-4 w-4" /> 3. Production Output</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <InputField label="Planned Qty" type="number" value={orderForm.outPlanned} onChange={(e: any) => setOrderForm({...orderForm, outPlanned: e.target.value})} />
                  <InputField label="Produced Qty" type="number" value={orderForm.outProduced} onChange={(e: any) => setOrderForm({...orderForm, outProduced: e.target.value})} />
                  <InputField label="Accepted Qty" type="number" value={orderForm.outAccepted} onChange={(e: any) => setOrderForm({...orderForm, outAccepted: e.target.value})} />
                  <InputField label="Rejected Qty" type="number" value={orderForm.outRejected} onChange={(e: any) => setOrderForm({...orderForm, outRejected: e.target.value})} />
                  <InputField label="Rework Qty" type="number" value={orderForm.outRework} onChange={(e: any) => setOrderForm({...orderForm, outRework: e.target.value})} />
                  <InputField label="Scrap Qty" type="number" value={orderForm.outScrap} onChange={(e: any) => setOrderForm({...orderForm, outScrap: e.target.value})} />
                </div>
              </div>

            </form>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm">Cancel</button>
              <button onClick={handleSaveOrder} className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium flex items-center gap-2 shadow-sm"><Save className="h-4 w-4" /> Save Order</button>
            </div>
          </div>
        </div>
      )}

      {/* BOM Modal */}
      {isBomModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingBomId ? "Edit Bill of Materials" : "Create Bill of Materials"}</h2>
              <button onClick={() => setIsBomModalOpen(false)} className="text-gray-500 hover:text-gray-900 transition-colors"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSaveBom} className="overflow-y-auto p-6 space-y-8 flex-1 custom-scrollbar">
              
              <div>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-4">1. BOM Identification</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField label="BOM Number" value={bomForm.bomNumber} onChange={(e: any) => setBomForm({...bomForm, bomNumber: e.target.value})} required placeholder="e.g. BOM-OP-001" />
                  <div className="col-span-2"><InputField label="Finished Product / Part Name" value={bomForm.product} onChange={(e: any) => setBomForm({...bomForm, product: e.target.value})} required placeholder="e.g. Oil Pump Assembly" /></div>
                  <InputField label="Part Number" value={bomForm.partNumber} onChange={(e: any) => setBomForm({...bomForm, partNumber: e.target.value})} required placeholder="e.g. OPA-100" />
                  <InputField label="Version / Revision" value={bomForm.version} onChange={(e: any) => setBomForm({...bomForm, version: e.target.value})} required placeholder="e.g. v1.2" />
                  <InputField label="Effective Date" type="date" value={bomForm.effectiveDate} onChange={(e: any) => setBomForm({...bomForm, effectiveDate: e.target.value})} required />
                  <InputField label="Expiry Date" type="date" value={bomForm.expiryDate} onChange={(e: any) => setBomForm({...bomForm, expiryDate: e.target.value})} />
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-600">Status</label>
                    <select value={bomForm.status} onChange={(e) => setBomForm({...bomForm, status: e.target.value})} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 shadow-sm">
                      <option value="Draft">Draft</option>
                      <option value="Active">Active</option>
                      <option value="Obsolete">Obsolete</option>
                      <option value="Under Review">Under Review</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Components Section */}
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wider flex items-center gap-2"><ListOrdered className="h-4 w-4" /> 2. Components & Quantities</h3>
                  <button type="button" onClick={() => setBomForm({...bomForm, components: [...bomForm.components, {name: "", qty: "", unit: "Pcs"}]})} className="text-xs text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow-sm">
                    <Plus className="h-3 w-3" /> Add Component
                  </button>
                </div>
                <div className="space-y-3">
                  {bomForm.components.map((comp, idx) => (
                     <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-3">
                       <input type="text" placeholder="Component / Material Name" value={comp.name} onChange={(e) => { const newComps = [...bomForm.components]; newComps[idx].name = e.target.value; setBomForm({...bomForm, components: newComps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 w-full md:flex-1 transition-colors shadow-sm" required />
                       <div className="flex items-center gap-3 w-full md:w-auto">
                         <input type="number" placeholder="Qty" value={comp.qty} onChange={(e) => { const newComps = [...bomForm.components]; newComps[idx].qty = e.target.value; setBomForm({...bomForm, components: newComps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 w-32 transition-colors shadow-sm" required />
                         <input type="text" placeholder="Unit" value={comp.unit} onChange={(e) => { const newComps = [...bomForm.components]; newComps[idx].unit = e.target.value; setBomForm({...bomForm, components: newComps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 w-32 transition-colors shadow-sm" required />
                         {bomForm.components.length > 1 && (
                            <button type="button" onClick={() => { const newComps = bomForm.components.filter((_, i) => i !== idx); setBomForm({...bomForm, components: newComps}); }} className="text-gray-500 hover:text-red-600 p-2 transition-colors" title="Remove Component">
                              <Trash2 className="h-4 w-4" />
                            </button>
                         )}
                       </div>
                     </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-4">3. Planning Parameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Expected Scrap %" value={bomForm.scrapPct} onChange={(e: any) => setBomForm({...bomForm, scrapPct: e.target.value})} placeholder="e.g. 2%" />
                  <InputField label="Wastage %" value={bomForm.wastagePct} onChange={(e: any) => setBomForm({...bomForm, wastagePct: e.target.value})} placeholder="e.g. 1%" />
                  <InputField label="Approved By" value={bomForm.approvedBy} onChange={(e: any) => setBomForm({...bomForm, approvedBy: e.target.value})} required />
                </div>
              </div>

            </form>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setIsBomModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition-colors shadow-sm">Cancel</button>
              <button onClick={handleSaveBom} className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium flex items-center gap-2 shadow-sm transition-colors"><Save className="h-4 w-4" /> Save BOM</button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingRecipeId ? "Edit Recipe" : "Create Manufacturing Recipe"}</h2>
              <button onClick={() => setIsRecipeModalOpen(false)} className="text-gray-500 hover:text-gray-900"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSaveRecipe} className="overflow-y-auto p-6 space-y-8 flex-1 custom-scrollbar">
              
              <div>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-4">1. Recipe Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField label="Recipe ID" value={recipeForm.recipeId} onChange={(e: any) => setRecipeForm({...recipeForm, recipeId: e.target.value})} required placeholder="e.g. REC-EV-001" />
                  <InputField label="Part/Product" value={recipeForm.product} onChange={(e: any) => setRecipeForm({...recipeForm, product: e.target.value})} required placeholder="e.g. Engine Valve" />
                  <InputField label="Version" value={recipeForm.version} onChange={(e: any) => setRecipeForm({...recipeForm, version: e.target.value})} required placeholder="e.g. v2.0" />
                  <InputField label="Batch Size" value={recipeForm.batchSize} onChange={(e: any) => setRecipeForm({...recipeForm, batchSize: e.target.value})} placeholder="e.g. 1000" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-4">2. Material Flow & Times</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField label="Raw Material" value={recipeForm.rawMaterial} onChange={(e: any) => setRecipeForm({...recipeForm, rawMaterial: e.target.value})} placeholder="e.g. Steel Alloy" />
                  <InputField label="Input Quantity" value={recipeForm.inputQty} onChange={(e: any) => setRecipeForm({...recipeForm, inputQty: e.target.value})} placeholder="e.g. 1050" />
                  <InputField label="Expected Output" value={recipeForm.expectedOutput} onChange={(e: any) => setRecipeForm({...recipeForm, expectedOutput: e.target.value})} placeholder="e.g. 1000" />
                  <InputField label="Expected Scrap %" value={recipeForm.expectedScrap} onChange={(e: any) => setRecipeForm({...recipeForm, expectedScrap: e.target.value})} placeholder="e.g. 4.7%" />
                  <InputField label="Setup Time" value={recipeForm.setupTime} onChange={(e: any) => setRecipeForm({...recipeForm, setupTime: e.target.value})} placeholder="e.g. 15m" />
                  <InputField label="Labour Time" value={recipeForm.labourTime} onChange={(e: any) => setRecipeForm({...recipeForm, labourTime: e.target.value})} placeholder="e.g. 40m" />
                  <InputField label="Standard Time" value={recipeForm.stdTime} onChange={(e: any) => setRecipeForm({...recipeForm, stdTime: e.target.value})} placeholder="e.g. 85m" />
                  <InputField label="Work Center" value={recipeForm.workCenter} onChange={(e: any) => setRecipeForm({...recipeForm, workCenter: e.target.value})} placeholder="e.g. WC-A" />
                </div>
              </div>

              {/* Dynamic Operations Editor */}
              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wider flex items-center gap-2">
                    <ListOrdered className="h-4 w-4" /> 3. Operations Routing
                  </h3>
                  <button type="button" onClick={() => setRecipeForm({...recipeForm, operations: [...recipeForm.operations, {sequence: String(recipeForm.operations.length + 1), name: "", machine: "", time: "", operator: "", input: "", output: "", qcReq: ""}]})} className="text-xs text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded flex items-center gap-1 transition-colors shadow-sm">
                    <Plus className="h-3 w-3" /> Add Operation
                  </button>
                </div>
                
                <div className="space-y-4">
                  {recipeForm.operations.map((op, idx) => (
                    <div key={idx} className="flex flex-col gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex justify-between items-center mb-1 border-b border-gray-200 pb-2">
                         <span className="text-xs font-bold text-gray-500">Operation Step {idx + 1}</span>
                         {recipeForm.operations.length > 1 && (
                           <button type="button" onClick={() => { const newOps = recipeForm.operations.filter((_, i) => i !== idx); setRecipeForm({...recipeForm, operations: newOps}); }} className="text-gray-400 hover:text-red-600 p-1 transition-colors" title="Remove Operation">
                             <Trash2 className="h-4 w-4" />
                           </button>
                         )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <input type="text" placeholder="Sequence (e.g. 1)" value={op.sequence} onChange={(e) => { const newOps = [...recipeForm.operations]; newOps[idx].sequence = e.target.value; setRecipeForm({...recipeForm, operations: newOps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 transition-colors shadow-sm" required />
                        <input type="text" placeholder="Operation Name (e.g. Cutting)" value={op.name} onChange={(e) => { const newOps = [...recipeForm.operations]; newOps[idx].name = e.target.value; setRecipeForm({...recipeForm, operations: newOps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 transition-colors shadow-sm" required />
                        <input type="text" placeholder="Machine (e.g. Saw)" value={op.machine} onChange={(e) => { const newOps = [...recipeForm.operations]; newOps[idx].machine = e.target.value; setRecipeForm({...recipeForm, operations: newOps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 transition-colors shadow-sm" required />
                        <input type="text" placeholder="Time (e.g. 2m)" value={op.time} onChange={(e) => { const newOps = [...recipeForm.operations]; newOps[idx].time = e.target.value; setRecipeForm({...recipeForm, operations: newOps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 transition-colors shadow-sm" required />
                        <input type="text" placeholder="Operator (e.g. Op-1)" value={op.operator} onChange={(e) => { const newOps = [...recipeForm.operations]; newOps[idx].operator = e.target.value; setRecipeForm({...recipeForm, operations: newOps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 transition-colors shadow-sm" required />
                        <input type="text" placeholder="Input Qty" value={op.input} onChange={(e) => { const newOps = [...recipeForm.operations]; newOps[idx].input = e.target.value; setRecipeForm({...recipeForm, operations: newOps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 transition-colors shadow-sm" required />
                        <input type="text" placeholder="Output Qty" value={op.output} onChange={(e) => { const newOps = [...recipeForm.operations]; newOps[idx].output = e.target.value; setRecipeForm({...recipeForm, operations: newOps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 transition-colors shadow-sm" required />
                        <input type="text" placeholder="QC Requirement" value={op.qcReq} onChange={(e) => { const newOps = [...recipeForm.operations]; newOps[idx].qcReq = e.target.value; setRecipeForm({...recipeForm, operations: newOps}); }} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 transition-colors shadow-sm" required />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-orange-600 uppercase tracking-wider mb-4">4. Quality & Compliance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Overall QC Parameters" value={recipeForm.qcParams} onChange={(e: any) => setRecipeForm({...recipeForm, qcParams: e.target.value})} placeholder="e.g. Tolerance +/- 0.01mm" />
                  <InputField label="Inspection Requirements" value={recipeForm.inspectionReqs} onChange={(e: any) => setRecipeForm({...recipeForm, inspectionReqs: e.target.value})} placeholder="e.g. Micrometer Check 100%" />
                  <InputField label="Overall Machine Group" value={recipeForm.machine} onChange={(e: any) => setRecipeForm({...recipeForm, machine: e.target.value})} placeholder="e.g. Multiple" />
                  <InputField label="Effective Date" type="date" value={recipeForm.effectiveDate} onChange={(e: any) => setRecipeForm({...recipeForm, effectiveDate: e.target.value})} required />
                  <InputField label="Approved By" value={recipeForm.approvedBy} onChange={(e: any) => setRecipeForm({...recipeForm, approvedBy: e.target.value})} required />
                </div>
              </div>

            </form>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setIsRecipeModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm">Cancel</button>
              <button onClick={handleSaveRecipe} className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium flex items-center gap-2 shadow-sm"><Save className="h-4 w-4" /> Save Recipe</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Sub-components ---
function SidebarButton({ id, active, onClick, icon, label }: { id: string, active: string, onClick: (id: string) => void, icon: React.ReactNode, label: string }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)} 
      className={`md:w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium whitespace-nowrap ${isActive ? "bg-orange-50 text-orange-600 border border-orange-200" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ title, value, icon, alert }: { title: string, value: string, icon: React.ReactNode, alert?: boolean }) {
  return (
    <div className={`bg-white border ${alert ? "border-red-500/30" : "border-gray-200"} p-5 rounded-xl flex flex-col justify-between hover:border-gray-300 transition-colors shadow-sm`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">{icon}</div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
    </div>
  );
}

function DistributionItem({ color, label, value, count }: { color: string, label: string, value: string, count: string }) {
  return (
    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
      <div className={`h-3 w-3 rounded-full ${color}`}></div>
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm font-bold text-gray-900">{value}</span>
          <span className="text-xs text-gray-500">{count}</span>
        </div>
      </div>
    </div>
  );
}

function WorkflowNode({ title, color }: { title: string, color: string }) {
  return (
    <div className={`px-4 py-2 rounded-full border text-xs font-bold border-${color}-200 bg-${color}-50 text-${color}-700 shadow-[0_0_10px_rgba(var(--color-${color}-500),0.05)]`}>
      {title}
    </div>
  );
}
function WorkflowArrow() {
  return <div className="flex-1 h-px bg-gray-300 mx-2 relative"><ArrowRight className="h-3 w-3 text-gray-400 absolute -right-1 -top-1.5" /></div>;
}

function InputField({ label, name, value, type = "text", onChange, required, placeholder }: { label: string, name?: string, value: string, type?: string, onChange: any, required?: boolean, placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-500 transition-all shadow-sm" placeholder={placeholder} />
    </div>
  );
}