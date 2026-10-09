"use client";

import { useState } from "react";
import { Truck, Box, ClipboardList, RotateCcw, AlertTriangle, CheckCircle, Clock, DollarSign, ArrowRight, ArrowRightLeft, Home, Plus, Filter, Edit, Trash2, X, Save, MapPin, Search, Activity, TrendingUp } from "lucide-react";

// --- Types & Initial Data ---
type Shipment = {
  id: string;
  shipmentNumber: string;
  salesOrder: string;
  customer: string;
  warehouse: string;
  shippingDate: string;
  expectedDeliveryDate: string;
  carrier: string;
  trackingNumber: string;
  shippingMethod: string;
  packageCount: string;
  weight: string;
  shippingCost: string;
  status: "Pending" | "Ready to Ship" | "In Transit" | "Delivered" | "Delayed" | "Returned";
};

type PickItem = {
  id: string;
  partNumber: string;
  partName: string;
  requiredQty: string;
  pickedQty: string;
  location: string;
  packageBox: string;
  weight: string;
  dimensions: string;
};

type ReturnItem = {
  id: string;
  returnShipment: string;
  reason: string;
  returnedQty: string;
  condition: "Good" | "Damaged" | "Defective";
  action: "Restock" | "Scrap" | "Pending Inspection";
};

const initialShipments: Shipment[] = [
  { id: "1", shipmentNumber: "SHP-10042", salesOrder: "SO-9921", customer: "Ali Motors", warehouse: "WH-1", shippingDate: "2026-10-09", expectedDeliveryDate: "2026-10-12", carrier: "TCS Logistics", trackingNumber: "TCS-8891234", shippingMethod: "Express Route", packageCount: "3", weight: "45.2 kg", shippingCost: "2500", status: "In Transit" },
  { id: "2", shipmentNumber: "SHP-10043", salesOrder: "SO-9925", customer: "Auto Parts City", warehouse: "WH-2", shippingDate: "2026-10-10", expectedDeliveryDate: "2026-10-14", carrier: "Leopard Courier", trackingNumber: "Pending", shippingMethod: "Standard Ground", packageCount: "1", weight: "12.5 kg", shippingCost: "850", status: "Ready to Ship" }
];

const initialPickList: PickItem[] = [
  { id: "p1", partNumber: "EV-001", partName: "Intake Valve Set", requiredQty: "20", pickedQty: "20", location: "WH-1 / Rack-A / Bin-3", packageBox: "Box-A12", weight: "5.0 kg", dimensions: "30x20x15 cm" },
  { id: "p2", partNumber: "MC-102", partName: "Master Cylinder", requiredQty: "5", pickedQty: "2", location: "WH-2 / Rack-C / Bin-1", packageBox: "Box-B04", weight: "15.0 kg", dimensions: "50x40x30 cm" }
];

const initialReturns: ReturnItem[] = [
  { id: "r1", returnShipment: "RET-5001", reason: "Wrong Part Ordered", returnedQty: "2", condition: "Good", action: "Restock" },
  { id: "r2", returnShipment: "RET-5002", reason: "Transit Damage", returnedQty: "1", condition: "Damaged", action: "Scrap" }
];

const emptyShipment: Omit<Shipment, "id"> = {
  shipmentNumber: "", salesOrder: "", customer: "", warehouse: "", shippingDate: "", expectedDeliveryDate: "", carrier: "", trackingNumber: "", shippingMethod: "", packageCount: "", weight: "", shippingCost: "", status: "Pending"
};

const emptyPickItem: Omit<PickItem, "id"> = {
  partNumber: "", partName: "", requiredQty: "", pickedQty: "", location: "", packageBox: "", weight: "", dimensions: ""
};

const emptyReturnItem: Omit<ReturnItem, "id"> = {
  returnShipment: "", reason: "", returnedQty: "", condition: "Good", action: "Restock"
};

export default function ShippingDashboard() {
  const [activeTab, setActiveTab] = useState("returns");

  // State: Shipments
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Shipment, "id">>(emptyShipment);
  const [editingId, setEditingId] = useState<string | null>(null);

  // State: Pick & Pack
  const [picks, setPicks] = useState<PickItem[]>(initialPickList);
  const [isPickModalOpen, setIsPickModalOpen] = useState(false);
  const [pickForm, setPickForm] = useState<Omit<PickItem, "id">>(emptyPickItem);
  const [editingPickId, setEditingPickId] = useState<string | null>(null);

  // State: Returns Management
  const [returns, setReturns] = useState<ReturnItem[]>(initialReturns);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnForm, setReturnForm] = useState<Omit<ReturnItem, "id">>(emptyReturnItem);
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);

  // Handlers: Shipments
  const handleOpenModal = (shipment?: Shipment) => {
    if (shipment) { setFormData(shipment); setEditingId(shipment.id); } 
    else { setFormData(emptyShipment); setEditingId(null); }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Confirm removal of this shipment record")) {
      setShipments(shipments.filter(s => s.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setShipments(shipments.map(s => s.id === editingId ? { ...formData, id: editingId } as Shipment : s));
    } else {
      setShipments([{ ...formData, id: Date.now().toString() } as Shipment, ...shipments]);
    }
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handlers: Pick & Pack
  const handleOpenPickModal = (item?: PickItem) => {
    if (item) { setPickForm(item); setEditingPickId(item.id); }
    else { setPickForm(emptyPickItem); setEditingPickId(null); }
    setIsPickModalOpen(true);
  };

  const handleDeletePick = (id: string) => {
    if (confirm("Confirm removal of this pick task")) {
      setPicks(picks.filter(p => p.id !== id));
    }
  };

  const handleSavePick = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPickId) {
      setPicks(picks.map(p => p.id === editingPickId ? { ...pickForm, id: editingPickId } as PickItem : p));
    } else {
      setPicks([{ ...pickForm, id: Date.now().toString() } as PickItem, ...picks]);
    }
    setIsPickModalOpen(false);
  };

  const handlePickInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPickForm(prev => ({ ...prev, [name]: value }));
  };

  // Handlers: Returns Management
  const handleOpenReturnModal = (item?: ReturnItem) => {
    if (item) { setReturnForm(item); setEditingReturnId(item.id); }
    else { setReturnForm(emptyReturnItem); setEditingReturnId(null); }
    setIsReturnModalOpen(true);
  };

  const handleDeleteReturn = (id: string) => {
    if (confirm("Confirm removal of this return record")) {
      setReturns(returns.filter(r => r.id !== id));
    }
  };

  const handleSaveReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReturnId) {
      setReturns(returns.map(r => r.id === editingReturnId ? { ...returnForm, id: editingReturnId } as ReturnItem : r));
    } else {
      setReturns([{ ...returnForm, id: Date.now().toString() } as ReturnItem, ...returns]);
    }
    setIsReturnModalOpen(false);
  };

  const handleReturnInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReturnForm(prev => ({ ...prev, [name]: value }));
  };

  // Utilities
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered": return "bg-green-50 text-green-700 border-green-200";
      case "In Transit": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Ready to Ship": return "bg-purple-50 text-purple-700 border-purple-200";
      case "Delayed": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "Returned": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getWorkflowIndex = (status: string) => {
    switch(status) {
      case "Pending": return 1;
      case "Ready to Ship": return 3;
      case "In Transit": return 4;
      case "Delivered": return 5;
      case "Returned": return 5;
      case "Delayed": return 3;
      default: return 0;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden relative">
      
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 bg-white flex flex-col flex-shrink-0 z-20">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <a href="." className="text-gray-500 hover:text-gray-900 transition-colors text-xs font-semibold uppercase tracking-wider mb-4 md:mb-6 flex items-center gap-2">
            ← Back to Modules
          </a>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-600" /> Shipping
          </h2>
        </div>
        
        <nav className="flex overflow-x-auto md:flex-col md:flex-1 p-4 gap-2 md:gap-0 md:space-y-1 md:overflow-y-auto custom-scrollbar">
          <SidebarButton id="dashboard" active={activeTab} onClick={setActiveTab} icon={<Home className="h-4 w-4 shrink-0" />} label="Dashboard & Workflow" />
          <SidebarButton id="shipments" active={activeTab} onClick={setActiveTab} icon={<Truck className="h-4 w-4 shrink-0" />} label="Shipments Master" />
          <SidebarButton id="pickpack" active={activeTab} onClick={setActiveTab} icon={<Box className="h-4 w-4 shrink-0" />} label="Pick & Pack" />
          <SidebarButton id="returns" active={activeTab} onClick={setActiveTab} icon={<RotateCcw className="h-4 w-4 shrink-0" />} label="Returns Management" />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto pb-12">

          {/* --- Tab Content: Dashboard & Workflow --- */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Shipping Logistics Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">Real-time tracking of outbound logistics and delivery operations.</p>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Pending Shipments" value="14" icon={<Clock className="h-5 w-5 text-gray-500" />} />
                <StatCard title="Ready to Ship" value="8" icon={<Box className="h-5 w-5 text-purple-600" />} />
                <StatCard title="In Transit" value="26" icon={<Truck className="h-5 w-5 text-blue-600" />} />
                <StatCard title="Delivered (MTD)" value="142" icon={<CheckCircle className="h-5 w-5 text-green-600" />} />
                <StatCard title="Delayed" value="3" icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />} alert />
                <StatCard title="Returned" value="2" icon={<RotateCcw className="h-5 w-5 text-red-600" />} alert />
                <StatCard title="Shipping Cost (MTD)" value="PKR 85.4K" icon={<DollarSign className="h-5 w-5 text-emerald-600" />} />
                <StatCard title="On-Time Rate" value="94.2%" icon={<Activity className="h-5 w-5 text-cyan-600" />} />
              </div>

              {/* Charts & Graphs Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" /> Shipping Volume Trend
                    </h2>
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded-full">+8.2% Growth</span>
                  </div>
                  <div className="flex items-end justify-between h-48 gap-2 mt-4 pt-6 border-b border-gray-200 pb-2">
                    {[
                      { month: "May", height: "40%", val: "320" }, { month: "Jun", height: "55%", val: "450" },
                      { month: "Jul", height: "45%", val: "380" }, { month: "Aug", height: "70%", val: "590" },
                      { month: "Sep", height: "85%", val: "680" }, { month: "Oct", height: "95%", val: "740" },
                    ].map((bar, i) => (
                      <div key={i} className="flex flex-col items-center w-full h-full group">
                        <div className="w-full relative flex justify-center h-full items-end">
                          <span className="absolute -top-8 text-xs font-semibold text-gray-900 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity bg-white border border-gray-200 shadow-md px-2 py-1 rounded">{bar.val}</span>
                          <div className="w-full max-w-[3rem] bg-purple-100 hover:bg-purple-500 rounded-t-sm transition-all duration-300" style={{ height: bar.height }}></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-3">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <Activity className="h-5 w-5 text-blue-600" /> Current Status Distribution
                  </h2>
                  <div className="space-y-6">
                    <div className="w-full h-8 flex rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                      <div className="h-full bg-green-500" style={{ width: "65%" }} title="Delivered"></div>
                      <div className="h-full bg-blue-500" style={{ width: "15%" }} title="In Transit"></div>
                      <div className="h-full bg-purple-500" style={{ width: "10%" }} title="Ready to Ship"></div>
                      <div className="h-full bg-gray-400" style={{ width: "6%" }} title="Pending"></div>
                      <div className="h-full bg-yellow-500" style={{ width: "2%" }} title="Delayed"></div>
                      <div className="h-full bg-red-500" style={{ width: "2%" }} title="Returned"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <DistributionItem color="bg-green-500" label="Delivered" value="65%" count="142" />
                      <DistributionItem color="bg-blue-500" label="In Transit" value="15%" count="26" />
                      <DistributionItem color="bg-purple-500" label="Ready" value="10%" count="8" />
                      <DistributionItem color="bg-gray-400" label="Pending" value="6%" count="14" />
                      <DistributionItem color="bg-yellow-500" label="Delayed" value="2%" count="3" />
                      <DistributionItem color="bg-red-500" label="Returned" value="2%" count="2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Workflow Flowchart */}
              <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-8 overflow-x-auto mt-8">
                <h2 className="text-lg font-bold text-gray-900 mb-8">Standard Shipping Workflow</h2>
                <div className="flex items-center justify-between min-w-[900px] py-4">
                  <WorkflowNode icon={<ClipboardList className="h-6 w-6 text-indigo-600" />} title="Sales Order" desc="Order Confirmed" color="indigo" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<Search className="h-6 w-6 text-cyan-600" />} title="Pick" desc="Locate in Warehouse" color="cyan" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<Box className="h-6 w-6 text-purple-600" />} title="Pack" desc="Boxing & Weighing" color="purple" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<Home className="h-6 w-6 text-gray-500" />} title="Ship" desc="Handover to Carrier" color="gray" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<Truck className="h-6 w-6 text-blue-600" />} title="In Transit" desc="Out for Delivery" color="blue" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<CheckCircle className="h-6 w-6 text-green-600" />} title="Delivered" desc="Received by Customer" color="green" />
                </div>
              </div>
            </div>
          )}

          {/* --- Tab Content: Shipments --- */}
          {activeTab === "shipments" && (
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Master Shipments Ledger</h2>
                  <p className="text-gray-500 text-sm mt-1">Manage, track, and update all dispatch records and live workflow tracking.</p>
                </div>
                <div className="flex gap-3">
                  <button className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 text-sm border border-gray-300 shadow-sm">
                    <Filter className="h-4 w-4" /> Filter
                  </button>
                  <button onClick={() => handleOpenModal()} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm shadow-sm">
                    <Plus className="h-4 w-4" /> New Shipment
                  </button>
                </div>
              </div>
              
              <div className="overflow-auto flex-1 rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-left text-sm text-gray-700 whitespace-nowrap">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-4 font-medium sticky left-0 bg-gray-50 z-20">Shipment Info</th>
                      <th className="px-4 py-4 font-medium">Logistics Details</th>
                      <th className="px-4 py-4 font-medium">Timeline</th>
                      <th className="px-4 py-4 font-medium">Package Specs</th>
                      <th className="px-4 py-4 font-medium">Status & Workflow</th>
                      <th className="px-4 py-4 font-medium text-right sticky right-0 bg-gray-50 z-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {shipments.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No shipments found.</td></tr>
                    ) : (
                      shipments.map((ship) => (
                        <tr key={ship.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-gray-50 z-10">
                            <div className="font-bold text-gray-900">{ship.shipmentNumber}</div>
                            <div className="text-xs text-gray-500 mt-1">SO: {ship.salesOrder}</div>
                            <div className="text-xs text-blue-600 mt-0.5">{ship.customer}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1 font-medium text-gray-800"><Truck className="h-3 w-3 text-gray-400" /> {ship.carrier}</div>
                            <div className="text-xs text-gray-500 mt-1">Method: {ship.shippingMethod}</div>
                            <div className="text-xs text-gray-500 mt-0.5 font-mono">Track: {ship.trackingNumber}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div><span className="text-gray-500 text-xs">Shipped:</span> {ship.shippingDate}</div>
                            <div className="mt-1"><span className="text-gray-500 text-xs">ETA:</span> {ship.expectedDeliveryDate}</div>
                            <div className="text-xs text-gray-500 mt-0.5">From: {ship.warehouse}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div>{ship.packageCount} Packages</div>
                            <div className="text-xs text-gray-500 mt-1">Weight: {ship.weight}</div>
                            <div className="text-xs text-emerald-600 mt-0.5">Cost: PKR {ship.shippingCost}</div>
                          </td>
                          <td className="px-4 py-4 min-w-[220px]">
                            <div className="mb-3">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusColor(ship.status)}`}>
                                {ship.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 w-full">
                              {["SO", "Pick", "Pack", "Ship", "Transit", "Delivered"].map((step, idx) => {
                                const isActive = idx <= getWorkflowIndex(ship.status);
                                return (
                                  <div key={step} className="flex-1 flex flex-col gap-1" title={step}>
                                    <div className={`h-1.5 w-full rounded-full ${isActive ? "bg-purple-600" : "bg-gray-200"}`}></div>
                                    <span className={`text-[9px] font-medium text-center ${isActive ? "text-purple-700" : "text-gray-400"}`}>{step}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right sticky right-0 bg-white group-hover:bg-gray-50 z-10">
                            <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleOpenModal(ship)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-purple-50 text-gray-600 hover:text-purple-600 rounded"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(ship.id)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
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

          {/* --- Tab Content: Pick & Pack --- */}
          {activeTab === "pickpack" && (
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Pick & Pack Operations</h2>
                  <p className="text-gray-500 text-sm mt-1">Manage warehouse item retrieval and packaging assignments.</p>
                </div>
                <button onClick={() => handleOpenPickModal()} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm shadow-sm">
                  <Plus className="h-4 w-4" /> Add Pick Task
                </button>
              </div>

              <div className="overflow-auto flex-1 rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-left text-sm text-gray-700 whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 font-medium">Part Details</th>
                      <th className="px-4 py-4 font-medium">Fulfillment Status</th>
                      <th className="px-4 py-4 font-medium">Warehouse Location</th>
                      <th className="px-4 py-4 font-medium">Package Details</th>
                      <th className="px-4 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {picks.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No pick tasks available.</td></tr>
                    ) : (
                      picks.map((item) => {
                        const required = Number(item.requiredQty) || 0;
                        const picked = Number(item.pickedQty) || 0;
                        const percent = required > 0 ? (picked / required) * 100 : 0;

                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-4 py-4">
                              <div className="font-bold text-gray-900">{item.partNumber}</div>
                              <div className="text-xs text-gray-500">{item.partName}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-900">{item.pickedQty} <span className="text-gray-500 font-normal">/ {item.requiredQty}</span></span>
                                {picked >= required && required > 0 ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <div className="h-2 w-16 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-600 transition-all duration-300" style={{ width: `${Math.min(percent, 100)}%` }}></div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 font-mono text-xs text-gray-500">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-gray-400" /> {item.location}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-gray-700">{item.packageBox}</div>
                              <div className="text-xs text-gray-500 mt-1">{item.weight} • {item.dimensions}</div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenPickModal(item)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-purple-50 text-gray-600 hover:text-purple-600 rounded"><Edit className="h-4 w-4" /></button>
                                <button onClick={() => handleDeletePick(item.id)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- Tab Content: Returns Management (FULLY FUNCTIONAL) --- */}
          {activeTab === "returns" && (
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Returns Management</h2>
                  <p className="text-gray-500 text-sm mt-1">Process returned shipments, evaluate item conditions, and assign Restock or Scrap actions.</p>
                </div>
                <button onClick={() => handleOpenReturnModal()} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm shadow-sm">
                  <Plus className="h-4 w-4" /> Log Return Shipment
                </button>
              </div>

              <div className="overflow-auto flex-1 rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-left text-sm text-gray-700 whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4 font-medium">Return Shipment</th>
                      <th className="px-6 py-4 font-medium">Reason</th>
                      <th className="px-6 py-4 font-medium">Returned Quantity</th>
                      <th className="px-6 py-4 font-medium">Condition</th>
                      <th className="px-6 py-4 font-medium">Restock / Scrap Action</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {returns.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No return records found.</td></tr>
                    ) : (
                      returns.map((ret) => (
                        <tr key={ret.id} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-purple-600" /> {ret.returnShipment}
                          </td>
                          <td className="px-6 py-4 text-gray-600">{ret.reason}</td>
                          <td className="px-6 py-4 font-bold text-gray-900">{ret.returnedQty} Units</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${ret.condition === "Good" ? "bg-green-50 text-green-700 border-green-200" : ret.condition === "Damaged" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                              {ret.condition}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${ret.action === "Restock" ? "bg-blue-50 text-blue-700 border-blue-200" : ret.action === "Scrap" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                              {ret.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleOpenReturnModal(ret)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-purple-50 text-gray-600 hover:text-purple-600 rounded"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => handleDeleteReturn(ret.id)} className="p-2 bg-gray-50 border border-gray-200 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded"><Trash2 className="h-4 w-4" /></button>
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

        </div>
      </div>

      {/* --- Shipment Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Shipment Details" : "Create New Shipment"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900 transition-colors"><X className="h-6 w-6" /></button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-8 flex-1 custom-scrollbar">
              <div>
                <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4">1. Order & Customer Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Shipment Number" name="shipmentNumber" value={formData.shipmentNumber} onChange={handleInputChange} required />
                  <InputField label="Sales Order" name="salesOrder" value={formData.salesOrder} onChange={handleInputChange} required />
                  <InputField label="Customer Name" name="customer" value={formData.customer} onChange={handleInputChange} required />
                  <InputField label="Origin Warehouse" name="warehouse" value={formData.warehouse} onChange={handleInputChange} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4">2. Logistics & Carrier</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField label="Shipping Date" name="shippingDate" type="date" value={formData.shippingDate} onChange={handleInputChange} required />
                  <InputField label="Expected Delivery Date" name="expectedDeliveryDate" type="date" value={formData.expectedDeliveryDate} onChange={handleInputChange} required />
                  <InputField label="Carrier (e.g., FedEx, TCS)" name="carrier" value={formData.carrier} onChange={handleInputChange} required />
                  <InputField label="Tracking Number" name="trackingNumber" value={formData.trackingNumber} onChange={handleInputChange} />
                  
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs font-medium text-gray-600">Shipping Method</label>
                    <select name="shippingMethod" value={formData.shippingMethod} onChange={handleInputChange} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-500 shadow-sm">
                      <option value="">Select Method</option>
                      <option value="Standard Ground">Standard Ground</option>
                      <option value="Express Route">Express Route</option>
                      <option value="Overnight Air">Overnight Air</option>
                      <option value="Freight LTL">Freight LTL</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs font-medium text-gray-600">Current Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-500 shadow-sm">
                      <option value="Pending">Pending</option>
                      <option value="Ready to Ship">Ready to Ship</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Returned">Returned</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-4">3. Package Specs & Financials</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Package Count" name="packageCount" type="number" value={formData.packageCount} onChange={handleInputChange} />
                  <InputField label="Total Weight" name="weight" value={formData.weight} onChange={handleInputChange} placeholder="e.g., 45.2 kg" />
                  <InputField label="Shipping Cost (PKR)" name="shippingCost" type="number" value={formData.shippingCost} onChange={handleInputChange} />
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition-colors font-medium shadow-sm">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors font-medium flex items-center gap-2 shadow-sm">
                <Save className="h-4 w-4" /> Save Shipment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Pick & Pack Modal --- */}
      {isPickModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingPickId ? "Update Pick Task" : "Assign Pick Task"}</h2>
              <button onClick={() => setIsPickModalOpen(false)} className="text-gray-500 hover:text-gray-900 transition-colors"><X className="h-6 w-6" /></button>
            </div>
            
            <form onSubmit={handleSavePick} className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Part Number" name="partNumber" value={pickForm.partNumber} onChange={handlePickInputChange} required />
                <InputField label="Part Name" name="partName" value={pickForm.partName} onChange={handlePickInputChange} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Required Quantity" name="requiredQty" type="number" value={pickForm.requiredQty} onChange={handlePickInputChange} required />
                <InputField label="Picked Quantity" name="pickedQty" type="number" value={pickForm.pickedQty} onChange={handlePickInputChange} required />
              </div>
              <InputField label="Warehouse Location (WH / Rack / Bin)" name="location" value={pickForm.location} onChange={handlePickInputChange} placeholder="e.g., WH-1 / Rack-A / Bin-3" required />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField label="Package / Box Assigned" name="packageBox" value={pickForm.packageBox} onChange={handlePickInputChange} placeholder="e.g., Box-A12" />
                <InputField label="Weight" name="weight" value={pickForm.weight} onChange={handlePickInputChange} placeholder="e.g., 5.0 kg" />
                <InputField label="Dimensions" name="dimensions" value={pickForm.dimensions} onChange={handlePickInputChange} placeholder="e.g., 30x20x15 cm" />
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setIsPickModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition-colors font-medium shadow-sm">Cancel</button>
              <button onClick={handleSavePick} className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors font-medium flex items-center gap-2 shadow-sm">
                <Save className="h-4 w-4" /> Save Pick Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Returns Management Modal --- */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingReturnId ? "Edit Return Record" : "Log Return Shipment"}</h2>
              <button onClick={() => setIsReturnModalOpen(false)} className="text-gray-500 hover:text-gray-900 transition-colors"><X className="h-6 w-6" /></button>
            </div>
            
            <form onSubmit={handleSaveReturn} className="overflow-y-auto p-6 space-y-4 flex-1 custom-scrollbar">
              <InputField label="Return Shipment Number" name="returnShipment" value={returnForm.returnShipment} onChange={handleReturnInputChange} placeholder="e.g., RET-5003" required />
              <InputField label="Reason for Return" name="reason" value={returnForm.reason} onChange={handleReturnInputChange} placeholder="e.g., Wrong Part Ordered" required />
              <InputField label="Returned Quantity" name="returnedQty" type="number" value={returnForm.returnedQty} onChange={handleReturnInputChange} required />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Condition *</label>
                  <select name="condition" value={returnForm.condition} onChange={handleReturnInputChange} required className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-500 shadow-sm">
                    <option value="Good">Good</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Defective">Defective</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Restock / Scrap Action *</label>
                  <select name="action" value={returnForm.action} onChange={handleReturnInputChange} required className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-500 shadow-sm">
                    <option value="Restock">Restock</option>
                    <option value="Scrap">Scrap</option>
                    <option value="Pending Inspection">Pending Inspection</option>
                  </select>
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setIsReturnModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition-colors font-medium shadow-sm">Cancel</button>
              <button onClick={handleSaveReturn} className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors font-medium flex items-center gap-2 shadow-sm">
                <Save className="h-4 w-4" /> Save Return Record
              </button>
            </div>
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
      className={`md:w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium whitespace-nowrap ${isActive ? "bg-purple-50 text-purple-600 border border-purple-200" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
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
      <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{value}</h3>
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

function WorkflowNode({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`bg-${color}-50 border border-${color}-200 p-4 rounded-xl mb-3`}>
        {icon}
      </div>
      <span className="text-sm font-bold text-gray-900">{title}</span>
      <span className="text-xs text-gray-500 mt-1 text-center max-w-[100px]">{desc}</span>
    </div>
  );
}

function WorkflowArrow() {
  return (
    <div className="flex-1 flex items-center px-4 -mt-8">
      <div className="h-px bg-gray-300 flex-1 relative"></div>
      <ArrowRight className="h-4 w-4 text-gray-400 -ml-1" />
    </div>
  );
}

function InputField({ label, name, value, type = "text", onChange, required, placeholder }: { label: string, name: string, value: string, type?: string, onChange: any, required?: boolean, placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">{label} {required && <span className="text-red-500">*</span>}</label>
      <input 
        type={type} 
        name={name} 
        value={value} 
        onChange={onChange}
        required={required}
        className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-500 transition-all shadow-sm"
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
      />
    </div>
  );
}