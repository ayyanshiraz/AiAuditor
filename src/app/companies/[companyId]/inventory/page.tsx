"use client";

import { useState } from "react";
import { Package, AlertTriangle, CheckCircle, DollarSign, ArrowDownRight, ArrowUpRight, LayoutGrid, ArrowRightLeft, Home, Plus, Filter, Box, BarChart3, ArrowRight, TrendingUp, Activity, Edit, Trash2, X, Save, Settings2, MapPin } from "lucide-react";

// --- Types & Initial Data ---
type Part = {
  id: string;
  partNumber: string;
  partName: string;
  category: string;
  subcategory: string;
  partType: string;
  oemNumber: string;
  vehicle: string;
  material: string;
  unit: string;
  cost: string;
  sellingPrice: string;
  reorderLevel: string;
  minStock: string;
  maxStock: string;
  supplier: string;
  warehouse: string;
  rack: string;
  bin: string;
  batchNumber: string;
  serialNumber: string;
  stock: string;
};

type SubCategory = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  title: string;
  items: SubCategory[];
};

type Transaction = {
  id: string;
  type: "Stock In" | "Stock Out";
  category: string;
  partId: string;
  quantity: string;
  date: string;
  reference: string;
};

type WarehouseLoc = {
  id: string;
  warehouse: string;
  rack: string;
  shelf: string;
  bin: string;
};

type StockTransfer = {
  id: string;
  partId: string;
  fromLoc: string;
  toLoc: string;
  quantity: string;
  date: string;
};

const initialParts: Part[] = [
  {
    id: "1", partNumber: "EV-001", partName: "Intake Valve Set", category: "Engine Parts", subcategory: "Valves", partType: "Finished Good", oemNumber: "OEM-8923", vehicle: "Civic 2020", material: "Steel Alloy", unit: "Set", cost: "4500", sellingPrice: "6000", stock: "140", reorderLevel: "50", minStock: "20", maxStock: "300", supplier: "Indus Auto", warehouse: "Main WH", rack: "Rack-A", bin: "Bin-3", batchNumber: "BT-9921", serialNumber: "N/A"
  },
  {
    id: "2", partNumber: "MC-102", partName: "Master Cylinder", category: "Hydraulic Brakes", subcategory: "Cylinder", partType: "Assembly", oemNumber: "OEM-1102", vehicle: "Corolla 2018", material: "Aluminum", unit: "Pcs", cost: "12000", sellingPrice: "15500", stock: "5", reorderLevel: "10", minStock: "5", maxStock: "50", supplier: "Global Parts", warehouse: "North Branch", rack: "Rack-C", bin: "Bin-1", batchNumber: "BT-4412", serialNumber: "SN-882319"
  }
];

const initialCategories: Category[] = [
  {
    id: "c1",
    title: "Engine Parts",
    items: [
      { id: "s1", name: "Engine Valves" },
      { id: "s2", name: "Pistons" },
      { id: "s3", name: "Piston Rings" },
      { id: "s4", name: "Bearings" }
    ]
  },
  {
    id: "c2",
    title: "Hydraulic Brake Parts",
    items: [
      { id: "s5", name: "Master Cylinder" },
      { id: "s6", name: "Wheel Cylinder" },
      { id: "s7", name: "Brake Pistons" },
      { id: "s8", name: "Brake Seals" }
    ]
  },
  {
    id: "c3",
    title: "Suspension Parts",
    items: [
      { id: "s9", name: "Ball Joints" },
      { id: "s10", name: "Control Arms" },
      { id: "s11", name: "Tie Rod Ends" },
      { id: "s12", name: "Bushes" }
    ]
  },
  {
    id: "c4",
    title: "Oil & Fuel Pumps",
    items: [
      { id: "s13", name: "Oil Pump Assembly" },
      { id: "s14", name: "Oil Pump Gear" },
      { id: "s15", name: "Oil Pump Housing" },
      { id: "s16", name: "Fuel Pump Assembly" },
      { id: "s17", name: "Fuel Pump Components" }
    ]
  }
];

const initialTransactions: Transaction[] = [
  { id: "t1", type: "Stock In", category: "Purchase", partId: "1", quantity: "50", date: "2026-10-01", reference: "PO-1001" },
  { id: "t2", type: "Stock Out", category: "Sales", partId: "2", quantity: "2", date: "2026-10-05", reference: "INV-2045" },
];

const initialLocations: WarehouseLoc[] = [
  { id: "l1", warehouse: "Main WH", rack: "Rack-A", shelf: "Shelf-1", bin: "Bin-3" },
  { id: "l2", warehouse: "North Branch", rack: "Rack-C", shelf: "Shelf-2", bin: "Bin-1" }
];

const initialTransfers: StockTransfer[] = [
  { id: "tr1", partId: "1", fromLoc: "Main WH", toLoc: "North Branch", quantity: "10", date: "2026-10-07" }
];

const emptyForm: Omit<Part, "id"> = {
  partNumber: "", partName: "", category: "", subcategory: "", partType: "", oemNumber: "", vehicle: "", material: "", unit: "", cost: "", sellingPrice: "", stock: "", reorderLevel: "", minStock: "", maxStock: "", supplier: "", warehouse: "", rack: "", bin: "", batchNumber: "", serialNumber: ""
};

const emptyTxForm: Omit<Transaction, "id"> = {
  type: "Stock In", category: "Purchase", partId: "", quantity: "", date: new Date().toISOString().split("T")[0], reference: ""
};

const emptyLocForm: Omit<WarehouseLoc, "id"> = {
  warehouse: "", rack: "", shelf: "", bin: ""
};

const emptyTransferForm: Omit<StockTransfer, "id"> = {
  partId: "", fromLoc: "", toLoc: "", quantity: "", date: new Date().toISOString().split("T")[0]
};

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState("warehouse");

  // State: Parts
  const [parts, setParts] = useState<Part[]>(initialParts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Part, "id">>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State: Categories
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ id: "", title: "" });
  
  // State: Subcategories
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subForm, setSubForm] = useState({ catId: "", id: "", name: "" });

  // State: Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txForm, setTxForm] = useState<Omit<Transaction, "id">>(emptyTxForm);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // State: Warehouse
  const [whSubTab, setWhSubTab] = useState("infrastructure");
  
  const [locations, setLocations] = useState<WarehouseLoc[]>(initialLocations);
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [locForm, setLocForm] = useState<Omit<WarehouseLoc, "id">>(emptyLocForm);
  const [editingLocId, setEditingLocId] = useState<string | null>(null);

  const [transfers, setTransfers] = useState<StockTransfer[]>(initialTransfers);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState<Omit<StockTransfer, "id">>(emptyTransferForm);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);

  // Handlers: Parts
  const handleOpenModal = (part?: Part) => {
    if (part) {
      setFormData(part);
      setEditingId(part.id);
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this part?")) {
      setParts(parts.filter(p => p.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setParts(parts.map(p => p.id === editingId ? { ...formData, id: editingId } : p));
    } else {
      setParts([...parts, { ...formData, id: Date.now().toString() }]);
    }
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handlers: Categories
  const openCategoryModal = (cat?: Category) => {
    if (cat) {
      setCategoryForm({ id: cat.id, title: cat.title });
    } else {
      setCategoryForm({ id: "", title: "" });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryForm.id) {
      setCategories(categories.map(c => c.id === categoryForm.id ? { ...c, title: categoryForm.title } : c));
    } else {
      setCategories([...categories, { id: Date.now().toString(), title: categoryForm.title, items: [] }]);
    }
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("Delete this entire category and all its subcategories?")) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  // Handlers: Subcategories
  const openSubModal = (catId: string, sub?: SubCategory) => {
    if (sub) {
      setSubForm({ catId, id: sub.id, name: sub.name });
    } else {
      setSubForm({ catId, id: "", name: "" });
    }
    setIsSubModalOpen(true);
  };

  const handleSaveSub = (e: React.FormEvent) => {
    e.preventDefault();
    setCategories(categories.map(c => {
      if (c.id === subForm.catId) {
        if (subForm.id) {
          return { ...c, items: c.items.map(s => s.id === subForm.id ? { ...s, name: subForm.name } : s) };
        } else {
          return { ...c, items: [...c.items, { id: Date.now().toString(), name: subForm.name }] };
        }
      }
      return c;
    }));
    setIsSubModalOpen(false);
  };

  const handleDeleteSub = (catId: string, subId: string) => {
    if (confirm("Delete this subcategory?")) {
      setCategories(categories.map(c => {
        if (c.id === catId) {
          return { ...c, items: c.items.filter(s => s.id !== subId) };
        }
        return c;
      }));
    }
  };

  // Handlers: Transactions
  const handleOpenTxModal = (tx?: Transaction) => {
    if (tx) {
      setTxForm(tx);
      setEditingTxId(tx.id);
    } else {
      setTxForm(emptyTxForm);
      setEditingTxId(null);
    }
    setIsTxModalOpen(true);
  };

  const handleDeleteTx = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction record?")) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTxId) {
      setTransactions(transactions.map(t => t.id === editingTxId ? { ...txForm, id: editingTxId } as Transaction : t));
    } else {
      setTransactions([...transactions, { ...txForm, id: Date.now().toString() } as Transaction]);
    }
    setIsTxModalOpen(false);
  };

  const handleTxInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "type") {
      setTxForm(prev => ({
        ...prev,
        type: value as Transaction["type"],
        category: value === "Stock In" ? "Purchase" : "Sales"
      }));
    } else {
      setTxForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handlers: Warehouse Locations
  const handleOpenLocModal = (loc?: WarehouseLoc) => {
    if (loc) {
      setLocForm(loc);
      setEditingLocId(loc.id);
    } else {
      setLocForm(emptyLocForm);
      setEditingLocId(null);
    }
    setIsLocModalOpen(true);
  };

  const handleDeleteLoc = (id: string) => {
    if (confirm("Delete this location structure?")) {
      setLocations(locations.filter(l => l.id !== id));
    }
  };

  const handleSaveLoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocId) {
      setLocations(locations.map(l => l.id === editingLocId ? { ...locForm, id: editingLocId } as WarehouseLoc : l));
    } else {
      setLocations([...locations, { ...locForm, id: Date.now().toString() } as WarehouseLoc]);
    }
    setIsLocModalOpen(false);
  };

  const handleLocInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocForm(prev => ({ ...prev, [name]: value }));
  };

  // Handlers: Stock Transfers
  const handleOpenTransferModal = (transfer?: StockTransfer) => {
    if (transfer) {
      setTransferForm(transfer);
      setEditingTransferId(transfer.id);
    } else {
      setTransferForm(emptyTransferForm);
      setEditingTransferId(null);
    }
    setIsTransferModalOpen(true);
  };

  const handleDeleteTransfer = (id: string) => {
    if (confirm("Delete this transfer record?")) {
      setTransfers(transfers.filter(t => t.id !== id));
    }
  };

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTransferId) {
      setTransfers(transfers.map(t => t.id === editingTransferId ? { ...transferForm, id: editingTransferId } as StockTransfer : t));
    } else {
      setTransfers([...transfers, { ...transferForm, id: Date.now().toString() } as StockTransfer]);
    }
    setIsTransferModalOpen(false);
  };

  const handleTransferInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTransferForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden relative">
      
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-gray-800 bg-gray-950 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-800">
          <a href="." className="text-gray-400 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider mb-6 flex items-center gap-2">
            ← Back to Modules
          </a>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Box className="h-5 w-5 text-blue-500" /> Inventory
          </h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarButton id="dashboard" active={activeTab} onClick={setActiveTab} icon={<BarChart3 className="h-4 w-4" />} label="Dashboard" />
          <SidebarButton id="parts" active={activeTab} onClick={setActiveTab} icon={<Package className="h-4 w-4" />} label="Parts & Products" />
          <SidebarButton id="categories" active={activeTab} onClick={setActiveTab} icon={<LayoutGrid className="h-4 w-4" />} label="Categories" />
          <SidebarButton id="transactions" active={activeTab} onClick={setActiveTab} icon={<ArrowRightLeft className="h-4 w-4" />} label="Transactions" />
          <SidebarButton id="warehouse" active={activeTab} onClick={setActiveTab} icon={<Home className="h-4 w-4" />} label="Warehouse Operations" />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto pb-12">

          {/* Tab Content: Dashboard */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-white">Inventory Intelligence Dashboard</h1>
                <p className="text-gray-400 text-sm mt-1">Real-time metrics, valuation trends, and movement flows.</p>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Parts" value={parts.length.toString()} subtitle="Unique SKUs" icon={<Package className="h-5 w-5 text-blue-500" />} />
                <StatCard title="Total Stock" value="15,832" subtitle="Physical units on hand" icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
                <StatCard title="Low Stock" value="42" subtitle="Below reorder level" icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />} alert />
                <StatCard title="Out of Stock" value="12" subtitle="Action required immediately" icon={<AlertTriangle className="h-5 w-5 text-red-500" />} alert />
                <StatCard title="Reserved Stock" value="850" subtitle="Allocated for production/sales" icon={<Box className="h-5 w-5 text-purple-500" />} />
                <StatCard title="Stock Value" value="PKR 4.2M" subtitle="Current asset valuation" icon={<DollarSign className="h-5 w-5 text-emerald-500" />} />
                <StatCard title="Stock In" value="+3,200" subtitle="Units received this month" icon={<ArrowDownRight className="h-5 w-5 text-cyan-500" />} />
                <StatCard title="Stock Out" value="-2,840" subtitle="Units dispatched this month" icon={<ArrowUpRight className="h-5 w-5 text-orange-500" />} />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" /> Stock Value Trend (6 Months)
                    </h2>
                    <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full">+12.4% Growth</span>
                  </div>
                  <div className="flex items-end justify-between h-48 gap-2 mt-4 pt-6 border-b border-gray-800 pb-2">
                    {[
                      { month: "May", height: "40%", val: "2.8M" }, { month: "Jun", height: "55%", val: "3.1M" },
                      { month: "Jul", height: "45%", val: "2.9M" }, { month: "Aug", height: "70%", val: "3.6M" },
                      { month: "Sep", height: "85%", val: "4.0M" }, { month: "Oct", height: "95%", val: "4.2M" },
                    ].map((bar, i) => (
                      <div key={i} className="flex flex-col items-center w-full group">
                        <div className="w-full relative flex justify-center h-full items-end">
                          <span className="absolute -top-8 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 px-2 py-1 rounded">PKR {bar.val}</span>
                          <div className="w-full max-w-[3rem] bg-blue-600/40 hover:bg-blue-500 rounded-t-sm transition-all duration-300" style={{ height: bar.height }}></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-3">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                    <Activity className="h-5 w-5 text-purple-500" /> Stock Status Distribution
                  </h2>
                  <div className="space-y-6">
                    <div className="w-full h-8 flex rounded-md overflow-hidden bg-gray-800">
                      <div className="h-full bg-green-500" style={{ width: "75%" }} title="Healthy Stock"></div>
                      <div className="h-full bg-purple-500" style={{ width: "15%" }} title="Reserved"></div>
                      <div className="h-full bg-yellow-500" style={{ width: "8%" }} title="Low Stock"></div>
                      <div className="h-full bg-red-500" style={{ width: "2%" }} title="Out of Stock"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <DistributionItem color="bg-green-500" label="Healthy / Available" value="75%" count="11,874 units" />
                      <DistributionItem color="bg-purple-500" label="Reserved Stock" value="15%" count="850 units" />
                      <DistributionItem color="bg-yellow-500" label="Low Stock" value="8%" count="42 SKUs" />
                      <DistributionItem color="bg-red-500" label="Out of Stock" value="2%" count="12 SKUs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Movement Flowchart */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-x-auto">
                <h2 className="text-lg font-bold text-white mb-8">Live Inventory Movement Flow</h2>
                <div className="flex items-center justify-between min-w-[800px] py-4">
                  <div className="flex flex-col items-center">
                    <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-full mb-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                      <ArrowDownRight className="h-6 w-6 text-cyan-400" />
                    </div>
                    <span className="text-sm font-bold text-white">Stock Inbound</span>
                    <span className="text-xs text-gray-400 mt-1">Purchases & Returns</span>
                    <span className="mt-2 text-xs font-mono bg-gray-950 px-2 py-1 rounded text-cyan-400">+3,200 units</span>
                  </div>
                  <div className="flex-1 flex items-center px-4">
                    <div className="h-px bg-gray-700 flex-1 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 bg-gray-900 px-2 text-xs text-gray-500 font-medium">Receiving</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-600 -ml-1" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-2xl mb-3 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                      <Home className="h-8 w-8 text-blue-400" />
                    </div>
                    <span className="text-base font-bold text-white">Central Warehouse</span>
                    <span className="text-xs text-gray-400 mt-1">Total Available Stock</span>
                    <span className="mt-2 text-sm font-mono font-bold bg-gray-950 px-3 py-1 rounded text-white">15,832 units</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center px-4 relative h-24">
                    <div className="h-px bg-gray-700 w-full absolute top-1/3 left-0"></div>
                    <div className="h-px bg-gray-700 w-full absolute bottom-1/3 left-0"></div>
                    <ArrowRight className="h-4 w-4 text-gray-600 absolute right-0 top-1/3 -mt-2 -mr-1" />
                    <ArrowRight className="h-4 w-4 text-gray-600 absolute right-0 bottom-1/3 -mt-2 -mr-1" />
                  </div>
                  <div className="flex flex-col justify-between h-32">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-500/10 border border-purple-500/30 p-2 rounded-lg">
                        <Box className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Reserved</p>
                        <p className="text-xs font-mono text-purple-400 mt-0.5">850 units</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-500/10 border border-orange-500/30 p-2 rounded-lg">
                        <ArrowUpRight className="h-4 w-4 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Stock Out</p>
                        <p className="text-xs font-mono text-orange-400 mt-0.5">2,840 units</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: Parts / Products */}
          {activeTab === "parts" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Master Parts List</h2>
                  <p className="text-gray-400 text-sm mt-1">Manage all your products, components, and their properties.</p>
                </div>
                <div className="flex gap-3">
                  <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm border border-gray-700 transition-colors">
                    <Filter className="h-4 w-4" /> Filter
                  </button>
                  <button 
                    onClick={() => handleOpenModal()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors shadow-lg shadow-blue-500/20"
                  >
                    <Plus className="h-4 w-4" /> Add Part
                  </button>
                </div>
              </div>
              
              <div className="overflow-auto flex-1 rounded-lg border border-gray-800 bg-gray-950/50">
                <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0 z-10 shadow-sm border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-4 font-medium sticky left-0 bg-gray-900 z-20">Part Info</th>
                      <th className="px-4 py-4 font-medium">Category / Type</th>
                      <th className="px-4 py-4 font-medium">Specs / App</th>
                      <th className="px-4 py-4 font-medium">Financials</th>
                      <th className="px-4 py-4 font-medium">Stock Levels</th>
                      <th className="px-4 py-4 font-medium">Location Tracking</th>
                      <th className="px-4 py-4 font-medium text-right sticky right-0 bg-gray-900 z-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {parts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                          No parts found. Click Add Part to create one.
                        </td>
                      </tr>
                    ) : (
                      parts.map((part) => (
                        <tr key={part.id} className="hover:bg-gray-800/40 transition-colors group">
                          <td className="px-4 py-4 sticky left-0 bg-gray-950 group-hover:bg-gray-800/40 transition-colors z-10">
                            <div className="font-bold text-white">{part.partNumber}</div>
                            <div className="text-gray-400">{part.partName}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div>{part.category} <span className="text-gray-600">/</span> {part.subcategory}</div>
                            <div className="text-xs text-blue-400 mt-1 px-2 py-0.5 bg-blue-500/10 rounded inline-block">{part.partType}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div><span className="text-gray-500 text-xs">OEM:</span> {part.oemNumber}</div>
                            <div><span className="text-gray-500 text-xs">App:</span> {part.vehicle}</div>
                            <div className="text-xs text-gray-400 mt-1">{part.material} • {part.unit}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div><span className="text-gray-500 text-xs">Cost:</span> PKR {part.cost}</div>
                            <div className="text-emerald-400"><span className="text-gray-500 text-xs">Sell:</span> PKR {part.sellingPrice}</div>
                            <div className="text-xs text-gray-500 mt-1">From: {part.supplier}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className={`font-bold text-lg ${parseInt(part.stock) <= parseInt(part.reorderLevel) ? "text-yellow-500" : "text-green-500"}`}>
                              {part.stock} <span className="text-xs font-normal text-gray-500">on hand</span>
                            </div>
                            <div className="text-xs text-gray-400 flex gap-2 mt-1">
                              <span>Reorder: {part.reorderLevel}</span>
                              <span className="text-gray-600">|</span>
                              <span>Min: {part.minStock} / Max: {part.maxStock}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-300">{part.warehouse} <span className="text-gray-600">→</span> {part.rack} <span className="text-gray-600">→</span> {part.bin}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Batch: <span className="text-gray-400">{part.batchNumber}</span> • S/N: <span className="text-gray-400">{part.serialNumber}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right sticky right-0 bg-gray-950 group-hover:bg-gray-800/40 transition-colors z-10">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleOpenModal(part)} className="p-2 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded transition-colors" title="Edit">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDelete(part.id)} className="p-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors" title="Delete">
                                <Trash2 className="h-4 w-4" />
                              </button>
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

          {/* Tab Content: Categories */}
          {activeTab === "categories" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-800">
                <div>
                  <h2 className="text-xl font-bold text-white">Product Categories</h2>
                  <p className="text-gray-400 text-sm mt-1">Hierarchical organization of all inventory items.</p>
                </div>
                <button 
                  onClick={() => openCategoryModal()} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors shadow-lg shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4" /> Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-sm col-span-2">No categories found. Click Add Category to create one.</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat.id} className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
                      <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-gray-900/50">
                        <div className="flex items-center gap-3">
                          <LayoutGrid className="h-5 w-5 text-blue-500" />
                          <h3 className="text-lg font-bold text-white">{cat.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openCategoryModal(cat)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors" title="Edit Category">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Delete Category">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-5">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subcategories ({cat.items.length})</span>
                          <button onClick={() => openSubModal(cat.id)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium">
                            <Plus className="h-3 w-3" /> Add Subcategory
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {cat.items.length === 0 ? (
                            <span className="text-sm text-gray-600 italic">No subcategories</span>
                          ) : (
                            cat.items.map((sub) => (
                              <div key={sub.id} className="group flex items-center gap-2 bg-gray-900 text-gray-300 text-sm pl-3 pr-1 py-1 rounded-md border border-gray-700 hover:border-gray-600 transition-colors">
                                <span>{sub.name}</span>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openSubModal(cat.id, sub)} className="p-1 text-gray-500 hover:text-blue-400 rounded">
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => handleDeleteSub(cat.id, sub.id)} className="p-1 text-gray-500 hover:text-red-400 rounded">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab Content: Transactions */}
          {activeTab === "transactions" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Inventory Transactions</h2>
                  <p className="text-gray-400 text-sm mt-1">Track all stock in and stock out movements.</p>
                </div>
                <button
                  onClick={() => handleOpenTxModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors shadow-lg shadow-blue-500/20"
                >
                  <Plus className="h-4 w-4" /> Add Transaction
                </button>
              </div>

              <div className="overflow-auto flex-1 rounded-lg border border-gray-800 bg-gray-950/50">
                <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0 z-10 shadow-sm border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-4 font-medium">Date</th>
                      <th className="px-4 py-4 font-medium">Type</th>
                      <th className="px-4 py-4 font-medium">Category</th>
                      <th className="px-4 py-4 font-medium">Part Item</th>
                      <th className="px-4 py-4 font-medium">Quantity</th>
                      <th className="px-4 py-4 font-medium">Reference</th>
                      <th className="px-4 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                          No transactions found. Click Add Transaction to log one.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => {
                        const part = parts.find(p => p.id === tx.partId);
                        return (
                          <tr key={tx.id} className="hover:bg-gray-800/40 transition-colors group">
                            <td className="px-4 py-4">{tx.date}</td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === "Stock In" ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"}`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-4 py-4">{tx.category}</td>
                            <td className="px-4 py-4">
                              <div className="font-bold text-white">{part?.partNumber || "Unknown ID"}</div>
                              <div className="text-xs text-gray-500">{part?.partName || "Unknown Part"}</div>
                            </td>
                            <td className="px-4 py-4 font-bold text-white">{tx.quantity}</td>
                            <td className="px-4 py-4 text-gray-400">{tx.reference}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenTxModal(tx)} className="p-2 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded transition-colors" title="Edit">
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDeleteTx(tx.id)} className="p-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors" title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Content: Warehouse (FULLY FUNCTIONAL) */}
          {activeTab === "warehouse" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Warehouse Operations</h2>
                  <p className="text-gray-400 text-sm mt-1">Manage physical infrastructure and internal stock flow.</p>
                </div>
                <div className="flex gap-2 bg-gray-950 p-1 rounded-lg border border-gray-800">
                  <button onClick={() => setWhSubTab("infrastructure")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${whSubTab === "infrastructure" ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-gray-900"}`}>
                    Infrastructure
                  </button>
                  <button onClick={() => setWhSubTab("transfers")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${whSubTab === "transfers" ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-gray-900"}`}>
                    Stock Transfers
                  </button>
                  <button onClick={() => setWhSubTab("bylocation")} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${whSubTab === "bylocation" ? "bg-gray-800 text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-gray-900"}`}>
                    Stock By Location
                  </button>
                </div>
              </div>

              {/* Sub-tab: Infrastructure */}
              {whSubTab === "infrastructure" && (
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-end mb-4">
                    <button onClick={() => handleOpenLocModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors shadow-lg shadow-blue-500/20">
                      <Plus className="h-4 w-4" /> Add Location Area
                    </button>
                  </div>
                  <div className="overflow-auto flex-1 rounded-lg border border-gray-800 bg-gray-950/50">
                    <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                      <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0 z-10 border-b border-gray-800">
                        <tr>
                          <th className="px-4 py-4 font-medium">Warehouse Entity</th>
                          <th className="px-4 py-4 font-medium">Rack Array</th>
                          <th className="px-4 py-4 font-medium">Shelf Layer</th>
                          <th className="px-4 py-4 font-medium">Bin Micro-Location</th>
                          <th className="px-4 py-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {locations.length === 0 ? (
                          <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No layout structures found. Please add a location.</td></tr>
                        ) : (
                          locations.map(loc => (
                            <tr key={loc.id} className="hover:bg-gray-800/40 transition-colors group">
                              <td className="px-4 py-4 font-bold text-white flex items-center gap-2"><Home className="h-4 w-4 text-blue-500" /> {loc.warehouse}</td>
                              <td className="px-4 py-4 text-gray-300">{loc.rack}</td>
                              <td className="px-4 py-4 text-gray-300">{loc.shelf}</td>
                              <td className="px-4 py-4 font-mono text-gray-400">{loc.bin}</td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleOpenLocModal(loc)} className="p-2 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded transition-colors"><Edit className="h-4 w-4" /></button>
                                  <button onClick={() => handleDeleteLoc(loc.id)} className="p-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
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

              {/* Sub-tab: Stock Transfers */}
              {whSubTab === "transfers" && (
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-end mb-4">
                    <button onClick={() => handleOpenTransferModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors shadow-lg shadow-blue-500/20">
                      <ArrowRightLeft className="h-4 w-4" /> Log Internal Transfer
                    </button>
                  </div>
                  <div className="overflow-auto flex-1 rounded-lg border border-gray-800 bg-gray-950/50">
                    <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                      <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0 z-10 border-b border-gray-800">
                        <tr>
                          <th className="px-4 py-4 font-medium">Movement Date</th>
                          <th className="px-4 py-4 font-medium">Part Asset</th>
                          <th className="px-4 py-4 font-medium">Origin Source</th>
                          <th className="px-4 py-4 font-medium">Destination Target</th>
                          <th className="px-4 py-4 font-medium">Volume</th>
                          <th className="px-4 py-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {transfers.length === 0 ? (
                          <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No active stock transfers recorded.</td></tr>
                        ) : (
                          transfers.map(tr => {
                            const part = parts.find(p => p.id === tr.partId);
                            return (
                              <tr key={tr.id} className="hover:bg-gray-800/40 transition-colors group">
                                <td className="px-4 py-4 text-gray-400">{tr.date}</td>
                                <td className="px-4 py-4 font-bold text-white">{part ? part.partNumber : "Unknown ID"}</td>
                                <td className="px-4 py-4"><span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-300">{tr.fromLoc}</span></td>
                                <td className="px-4 py-4"><span className="bg-blue-900/30 border border-blue-800 px-2 py-1 rounded text-xs text-blue-400">{tr.toLoc}</span></td>
                                <td className="px-4 py-4 font-bold text-emerald-400">{tr.quantity} units</td>
                                <td className="px-4 py-4 text-right">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenTransferModal(tr)} className="p-2 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded transition-colors"><Edit className="h-4 w-4" /></button>
                                    <button onClick={() => handleDeleteTransfer(tr.id)} className="p-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab: Stock By Location */}
              {whSubTab === "bylocation" && (
                <div className="flex-1 flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-6">
                    {/* Unique Warehouses Grouping */}
                    {Array.from(new Set(parts.map(p => p.warehouse))).filter(Boolean).map(whName => (
                      <div key={whName} className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
                        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3">
                          <MapPin className="h-5 w-5 text-purple-500" />
                          <h3 className="text-lg font-bold text-white">{whName}</h3>
                        </div>
                        <div className="p-4 flex flex-col gap-3 max-h-64 overflow-y-auto custom-scrollbar">
                          {parts.filter(p => p.warehouse === whName).map(part => (
                            <div key={part.id} className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-800">
                              <div>
                                <p className="text-sm font-bold text-gray-200">{part.partNumber}</p>
                                <p className="text-xs text-gray-500 mt-1">{part.rack} → {part.bin}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-mono font-bold text-emerald-400">{part.stock}</p>
                                <p className="text-xs text-gray-500 mt-1">units</p>
                              </div>
                            </div>
                          ))}
                          {parts.filter(p => p.warehouse === whName).length === 0 && (
                            <p className="text-xs text-gray-600 italic">No inventory deployed here.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* --- Modals --- */}

      {/* Parts Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{editingId ? "Edit Part Details" : "Add New Part"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-8 flex-1 custom-scrollbar">
              <div>
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">1. General Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Part Number" name="partNumber" value={formData.partNumber} onChange={handleInputChange} required />
                  <InputField label="Part Name" name="partName" value={formData.partName} onChange={handleInputChange} required />
                  <InputField label="Part Type" name="partType" value={formData.partType} onChange={handleInputChange} />
                  <InputField label="Category" name="category" value={formData.category} onChange={handleInputChange} />
                  <InputField label="Subcategory" name="subcategory" value={formData.subcategory} onChange={handleInputChange} />
                  <InputField label="Unit" name="unit" value={formData.unit} onChange={handleInputChange} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">2. Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="OEM Number" name="oemNumber" value={formData.oemNumber} onChange={handleInputChange} />
                  <InputField label="Vehicle / Application" name="vehicle" value={formData.vehicle} onChange={handleInputChange} />
                  <InputField label="Material" name="material" value={formData.material} onChange={handleInputChange} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">3. Financials & Stock Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField label="Cost (PKR)" name="cost" type="number" value={formData.cost} onChange={handleInputChange} required />
                  <InputField label="Selling Price (PKR)" name="sellingPrice" type="number" value={formData.sellingPrice} onChange={handleInputChange} required />
                  <InputField label="Supplier" name="supplier" value={formData.supplier} onChange={handleInputChange} />
                  <div className="col-span-4 grid grid-cols-4 gap-4 mt-2">
                    <InputField label="Current Stock" name="stock" type="number" value={formData.stock} onChange={handleInputChange} required />
                    <InputField label="Reorder Level" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleInputChange} />
                    <InputField label="Minimum Stock" name="minStock" type="number" value={formData.minStock} onChange={handleInputChange} />
                    <InputField label="Maximum Stock" name="maxStock" type="number" value={formData.maxStock} onChange={handleInputChange} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">4. Location & Tracking</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <InputField label="Warehouse" name="warehouse" value={formData.warehouse} onChange={handleInputChange} />
                  <InputField label="Rack" name="rack" value={formData.rack} onChange={handleInputChange} />
                  <InputField label="Bin" name="bin" value={formData.bin} onChange={handleInputChange} />
                  <InputField label="Batch Number" name="batchNumber" value={formData.batchNumber} onChange={handleInputChange} />
                  <InputField label="Serial Number" name="serialNumber" value={formData.serialNumber} onChange={handleInputChange} />
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-800 bg-gray-950 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-medium">
                Cancel
              </button>
              <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors font-medium flex items-center gap-2">
                <Save className="h-4 w-4" /> Save Part
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{categoryForm.id ? "Edit Category" : "Add New Category"}</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6">
              <div className="flex flex-col gap-2 mb-8">
                <label className="text-sm font-medium text-gray-400">Category Name</label>
                <input 
                  type="text" 
                  value={categoryForm.title} 
                  onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                  required
                  className="bg-gray-950 border border-gray-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Engine Parts"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 font-medium">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {isSubModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{subForm.id ? "Edit Subcategory" : "Add Subcategory"}</h2>
              <button onClick={() => setIsSubModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSaveSub} className="p-6">
              <div className="flex flex-col gap-2 mb-8">
                <label className="text-sm font-medium text-gray-400">Subcategory Name</label>
                <input 
                  type="text" 
                  value={subForm.name} 
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  required
                  className="bg-gray-950 border border-gray-700 rounded-md px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g., Pistons"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsSubModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 font-medium">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium">
                  Save Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{editingTxId ? "Edit Transaction" : "Add Transaction"}</h2>
              <button onClick={() => setIsTxModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSaveTx} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-400">Transaction Type *</label>
                  <select name="type" value={txForm.type} onChange={handleTxInputChange} required className="bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="Stock In">Stock In</option>
                    <option value="Stock Out">Stock Out</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-400">Category *</label>
                  <select name="category" value={txForm.category} onChange={handleTxInputChange} required className="bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    {txForm.type === "Stock In" ? (
                      <>
                        <option value="Purchase">Purchase</option>
                        <option value="Production">Production</option>
                        <option value="Customer Return">Customer Return</option>
                      </>
                    ) : (
                      <>
                        <option value="Sales">Sales</option>
                        <option value="Production Consumption">Production Consumption</option>
                        <option value="Supplier Return">Supplier Return</option>
                        <option value="Adjustment">Adjustment</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-400">Select Part *</label>
                <select name="partId" value={txForm.partId} onChange={handleTxInputChange} required className="bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <option value="" disabled>Choose a part from inventory</option>
                  {parts.map(p => <option key={p.id} value={p.id}>{p.partNumber} - {p.partName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Quantity" name="quantity" type="number" value={txForm.quantity} onChange={handleTxInputChange} required />
                <InputField label="Date" name="date" type="date" value={txForm.date} onChange={handleTxInputChange} required />
              </div>
              <InputField label="Reference (PO, Invoice, etc.)" name="reference" value={txForm.reference} onChange={handleTxInputChange} required />
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setIsTxModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2"><Save className="h-4 w-4" /> Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warehouse Location Modal */}
      {isLocModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{editingLocId ? "Modify Location Array" : "Design New Layout Space"}</h2>
              <button onClick={() => setIsLocModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSaveLoc} className="p-6 space-y-4">
              <InputField label="Warehouse Entity" name="warehouse" value={locForm.warehouse} onChange={handleLocInputChange} required />
              <InputField label="Rack System Identifier" name="rack" value={locForm.rack} onChange={handleLocInputChange} required />
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Shelf Layer" name="shelf" value={locForm.shelf} onChange={handleLocInputChange} required />
                <InputField label="Bin / Compartment" name="bin" value={locForm.bin} onChange={handleLocInputChange} required />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setIsLocModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2"><Save className="h-4 w-4" /> Construct Node</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{editingTransferId ? "Correct Movement Log" : "Execute Internal Transfer"}</h2>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSaveTransfer} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-400">Select Part Asset *</label>
                <select name="partId" value={transferForm.partId} onChange={handleTransferInputChange} required className="bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <option value="" disabled>Select hardware component</option>
                  {parts.map(p => <option key={p.id} value={p.id}>{p.partNumber} - {p.partName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Origin Source" name="fromLoc" value={transferForm.fromLoc} onChange={handleTransferInputChange} required />
                <InputField label="Destination Target" name="toLoc" value={transferForm.toLoc} onChange={handleTransferInputChange} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Transfer Volume" name="quantity" type="number" value={transferForm.quantity} onChange={handleTransferInputChange} required />
                <InputField label="Execution Date" name="date" type="date" value={transferForm.date} onChange={handleTransferInputChange} required />
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2"><Save className="h-4 w-4" /> Authorize Route</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-components
function SidebarButton({ id, active, onClick, icon, label }: { id: string, active: string, onClick: (id: string) => void, icon: React.ReactNode, label: string }) {
  const isActive = active === id;
  return (
    <button 
      onClick={() => onClick(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${isActive ? "bg-blue-600/10 text-blue-500 border border-blue-500/20" : "text-gray-400 hover:bg-gray-900 hover:text-white"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ title, value, subtitle, icon, alert }: { title: string, value: string, subtitle: string, icon: React.ReactNode, alert?: boolean }) {
  return (
    <div className={`bg-gray-900 border ${alert ? "border-red-500/30" : "border-gray-800"} p-5 rounded-xl flex flex-col justify-between hover:border-gray-700 transition-colors`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        <div className="bg-gray-950 p-2 rounded-lg border border-gray-800">
          {icon}
        </div>
      </div>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

function DistributionItem({ color, label, value, count }: { color: string, label: string, value: string, count: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-950 p-3 rounded-lg border border-gray-800">
      <div className={`h-3 w-3 rounded-full ${color}`}></div>
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-300">{label}</p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm font-bold text-white">{value}</span>
          <span className="text-xs text-gray-500">{count}</span>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, name, value, type = "text", onChange, required }: { label: string, name: string, value: string, type?: string, onChange: any, required?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400">{label} {required && <span className="text-red-500">*</span>}</label>
      <input 
        type={type} 
        name={name} 
        value={value} 
        onChange={onChange}
        required={required}
        className="bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </div>
  );
}