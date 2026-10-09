"use client";

import { useState } from "react";
import { ShoppingCart, DollarSign, TrendingUp, FileText, CheckCircle, Clock, Plus, Filter, Edit, Trash2, X, Save, BarChart3, Users, AlertTriangle, Factory, ArrowRight, Package, Building2, MapPin, Activity, Truck } from "lucide-react";

// --- Types & Initial Data ---
type OrderStatus = "Draft" | "Confirmed" | "Reserved" | "Processing" | "Ready to Ship" | "Shipped" | "Delivered" | "Completed" | "Cancelled";

type SaleOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  salesperson: string;
  warehouse: string;
  partNumber: string;
  partName: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  tax: string;
  shippingCharges: string;
  totalAmount: string;
  status: OrderStatus;
};

type Customer = {
  id: string;
  code: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  customerType: string;
  paymentTerms: string;
  creditLimit: string;
};

const initialOrders: SaleOrder[] = [
  { id: "1", orderNumber: "SO-9921", customerName: "Ali Motors", orderDate: "2026-10-05", deliveryDate: "2026-10-10", salesperson: "Yasir Irshad", warehouse: "WH-1", partNumber: "EV-001", partName: "Intake Valve Set", quantity: "20", unitPrice: "6000", discount: "5000", tax: "18%", shippingCharges: "1500", totalAmount: "125000", status: "Completed" },
  { id: "2", orderNumber: "SO-9925", customerName: "Auto Parts City", orderDate: "2026-10-08", deliveryDate: "2026-10-14", salesperson: "Ayan Shiraz", warehouse: "WH-2", partNumber: "MC-102", partName: "Master Cylinder", quantity: "150", unitPrice: "15500", discount: "0", tax: "18%", shippingCharges: "850", totalAmount: "2325000", status: "Processing" }
];

const initialCustomers: Customer[] = [
  { id: "c1", code: "CUST-001", companyName: "Ali Motors", contactPerson: "Ali Raza", phone: "+92 300 1234567", email: "ali@alimotors.pk", billingAddress: "123 Auto Market, Lahore", shippingAddress: "123 Auto Market, Lahore", customerType: "Wholesale", paymentTerms: "Net 30", creditLimit: "PKR 500,000" },
  { id: "c2", code: "CUST-002", companyName: "Auto Parts City", contactPerson: "Imran Khan", phone: "+92 321 7654321", email: "imran@autopartscity.com", billingAddress: "45 Plaza, Karachi", shippingAddress: "Warehouse 2, Karachi", customerType: "Retail", paymentTerms: "Cash on Delivery", creditLimit: "PKR 100,000" }
];

const emptyOrder: Omit<SaleOrder, "id"> = { orderNumber: "", customerName: "", orderDate: new Date().toISOString().split("T")[0], deliveryDate: "", salesperson: "", warehouse: "", partNumber: "", partName: "", quantity: "", unitPrice: "", discount: "", tax: "18%", shippingCharges: "", totalAmount: "", status: "Draft" };
const emptyCustomer: Omit<Customer, "id"> = { code: "", companyName: "", contactPerson: "", phone: "", email: "", billingAddress: "", shippingAddress: "", customerType: "Retail", paymentTerms: "Cash on Delivery", creditLimit: "" };

export default function SalesDashboard() {
  const [activeTab, setActiveTab] = useState("customers");
  
  // State: Orders
  const [orders, setOrders] = useState<SaleOrder[]>(initialOrders);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<Omit<SaleOrder, "id">>(emptyOrder);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // State: Customers
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [custForm, setCustForm] = useState<Omit<Customer, "id">>(emptyCustomer);
  const [editingCustId, setEditingCustId] = useState<string | null>(null);

  // --- Handlers: Orders ---
  const openOrderModal = (order?: SaleOrder) => {
    if (order) { setOrderForm(order); setEditingOrderId(order.id); } 
    else { setOrderForm(emptyOrder); setEditingOrderId(null); }
    setIsOrderModalOpen(true);
  };
  
  const handleDeleteOrder = (id: string) => { 
    if (confirm("Confirm removal of this order record")) {
      setOrders(orders.filter(o => o.id !== id)); 
    }
  };
  
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrderId) setOrders(orders.map(o => o.id === editingOrderId ? { ...orderForm, id: editingOrderId } as SaleOrder : o));
    else setOrders([{ ...orderForm, id: Date.now().toString() } as SaleOrder, ...orders]);
    setIsOrderModalOpen(false);
  };

  // --- Handlers: Customers ---
  const openCustModal = (cust?: Customer) => {
    if (cust) { setCustForm(cust); setEditingCustId(cust.id); } 
    else { setCustForm(emptyCustomer); setEditingCustId(null); }
    setIsCustModalOpen(true);
  };
  
  const handleDeleteCust = (id: string) => { 
    if (confirm("Confirm removal of this customer profile?")) {
      setCustomers(customers.filter(c => c.id !== id)); 
    }
  };
  
  const handleSaveCust = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustId) setCustomers(customers.map(c => c.id === editingCustId ? { ...custForm, id: editingCustId } as Customer : c));
    else setCustomers([{ ...custForm, id: Date.now().toString() } as Customer, ...customers]);
    setIsCustModalOpen(false);
  };

  // Utilities for Sales Order Workflow
  const getOrderWorkflowIndex = (status: string) => {
    switch(status) {
      case "Draft": return 0;
      case "Confirmed": return 1;
      case "Reserved": return 2;
      case "Processing": return 3;
      case "Ready to Ship": return 4;
      case "Shipped": return 5;
      case "Delivered": return 6;
      case "Completed": return 7;
      default: return -1;
    }
  };

  const workflowSteps = ["Draft", "Confirmed", "Reserved", "Processing", "Ready", "Shipped", "Delivered", "Done"];

  // Automated Integration Checks (MOCK LOGIC)
  const availableStock = 120;
  const reservedStock = 15;
  const requestedQuantity = Number(orderForm.quantity) || 0;
  const effectiveStock = availableStock - reservedStock;
  const shortageAmount = requestedQuantity > effectiveStock ? requestedQuantity - effectiveStock : 0;
  const isShortage = shortageAmount > 0;

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden relative">
      
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-gray-800 bg-gray-950 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-800">
          <a href="." className="text-gray-400 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider mb-6 flex items-center gap-2">
            ← Back to Modules
          </a>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-500" /> Sales
          </h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarButton id="dashboard" active={activeTab} onClick={setActiveTab} icon={<BarChart3 className="h-4 w-4" />} label="Dashboard" />
          <SidebarButton id="orders" active={activeTab} onClick={setActiveTab} icon={<FileText className="h-4 w-4" />} label="Sales Orders" />
          <SidebarButton id="customers" active={activeTab} onClick={setActiveTab} icon={<Users className="h-4 w-4" />} label="Customers Directory" />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto pb-12">

          {/* --- DASHBOARD TAB --- */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-white">Sales & Revenue Intelligence</h1>
                <p className="text-gray-400 text-sm mt-1">Comprehensive overview of orders, revenue, and customer performance.</p>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Total Sales" value="PKR 4.2M" icon={<DollarSign className="h-5 w-5 text-emerald-500" />} />
                <StatCard title="Revenue (MTD)" value="PKR 1.8M" icon={<TrendingUp className="h-5 w-5 text-cyan-500" />} />
                <StatCard title="Total Orders" value="1,284" icon={<ShoppingCart className="h-5 w-5 text-blue-500" />} />
                <StatCard title="Pending Orders" value="42" icon={<Clock className="h-5 w-5 text-yellow-500" />} alert />
                <StatCard title="Completed Orders" value="1,150" icon={<CheckCircle className="h-5 w-5 text-green-500" />} />
                <StatCard title="Cancelled Orders" value="12" icon={<X className="h-5 w-5 text-red-500" />} alert />
              </div>

              {/* Charts & Graphs Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Revenue Trend Bar Chart */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-500" /> Revenue Trend
                    </h2>
                    <span className="text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full">+14.2% Growth</span>
                  </div>
                  <div className="flex items-end justify-between h-48 gap-2 mt-4 pt-6 border-b border-gray-800 pb-2">
                    {[
                      { month: "May", height: "40%", val: "2.1M" }, { month: "Jun", height: "55%", val: "2.8M" },
                      { month: "Jul", height: "45%", val: "2.4M" }, { month: "Aug", height: "70%", val: "3.2M" },
                      { month: "Sep", height: "85%", val: "3.8M" }, { month: "Oct", height: "95%", val: "4.2M" },
                    ].map((bar, i) => (
                      <div key={i} className="flex flex-col items-center w-full group">
                        <div className="w-full relative flex justify-center h-full items-end">
                          <span className="absolute -top-8 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 px-2 py-1 rounded">PKR {bar.val}</span>
                          <div className="w-full max-w-[3rem] bg-emerald-600/40 hover:bg-emerald-500 rounded-t-sm transition-all duration-300" style={{ height: bar.height }}></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-3">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 2: Order Status Distribution Graph */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                    <Activity className="h-5 w-5 text-blue-500" /> Order Status Distribution
                  </h2>
                  <div className="space-y-6">
                    {/* Stacked Progress Bar */}
                    <div className="w-full h-8 flex rounded-md overflow-hidden bg-gray-800">
                      <div className="h-full bg-emerald-500" style={{ width: "70%" }} title="Completed"></div>
                      <div className="h-full bg-blue-500" style={{ width: "15%" }} title="Processing"></div>
                      <div className="h-full bg-yellow-500" style={{ width: "10%" }} title="Pending"></div>
                      <div className="h-full bg-red-500" style={{ width: "5%" }} title="Cancelled"></div>
                    </div>
                    {/* Distribution Legend & Values */}
                    <div className="grid grid-cols-2 gap-4">
                      <DistributionItem color="bg-emerald-500" label="Completed" value="70%" count="1,150 Orders" />
                      <DistributionItem color="bg-blue-500" label="Processing" value="15%" count="230 Orders" />
                      <DistributionItem color="bg-yellow-500" label="Pending" value="10%" count="42 Orders" />
                      <DistributionItem color="bg-red-500" label="Cancelled" value="5%" count="12 Orders" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lists: Top Sellers & Customers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Package className="h-5 w-5 text-purple-500" /> Top Selling Parts</h2>
                  <ul className="space-y-4">
                    <TopListItem rank="1" name="Intake Valve Set (EV-001)" value="840 Units" rev="PKR 1.2M" />
                    <TopListItem rank="2" name="Master Cylinder (MC-102)" value="320 Units" rev="PKR 850K" />
                    <TopListItem rank="3" name="Brake Pads (BP-209)" value="215 Units" rev="PKR 420K" />
                  </ul>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> Top Customers</h2>
                  <ul className="space-y-4">
                    <TopListItem rank="1" name="Ali Motors" value="42 Orders" rev="PKR 2.4M" />
                    <TopListItem rank="2" name="Auto Parts City" value="28 Orders" rev="PKR 1.1M" />
                    <TopListItem rank="3" name="Honda Center" value="15 Orders" rev="PKR 950K" />
                  </ul>
                </div>
              </div>

              {/* Sales Workflow Flowchart */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 overflow-x-auto">
                <h2 className="text-lg font-bold text-white mb-8">Sales Order Lifecycle Workflow</h2>
                <div className="flex items-center justify-between min-w-[900px] py-4">
                  <WorkflowNode icon={<FileText className="h-6 w-6 text-gray-400" />} title="Draft" desc="Quote Created" color="gray" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<CheckCircle className="h-6 w-6 text-blue-400" />} title="Confirmed" desc="Order Approved" color="blue" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<Package className="h-6 w-6 text-purple-400" />} title="Reserved" desc="Stock Allocated" color="purple" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<Factory className="h-6 w-6 text-yellow-400" />} title="Processing" desc="Pick & Pack" color="yellow" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<Truck className="h-6 w-6 text-indigo-400" />} title="Shipped" desc="In Transit" color="indigo" />
                  <WorkflowArrow />
                  <WorkflowNode icon={<CheckCircle className="h-6 w-6 text-emerald-400" />} title="Completed" desc="Delivered & Paid" color="emerald" />
                </div>
              </div>
            </div>
          )}

          {/* --- ORDERS TAB --- */}
          {activeTab === "orders" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Sales Orders Ledger</h2>
                  <p className="text-gray-400 text-sm mt-1">Manage full order cycles from draft to completion with live workflow tracking.</p>
                </div>
                <button onClick={() => openOrderModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20">
                  <Plus className="h-4 w-4" /> Create Sales Order
                </button>
              </div>
              
              <div className="overflow-auto flex-1 rounded-lg border border-gray-800 bg-gray-950/50">
                <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0 z-10 border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-4 font-medium">Order Number</th>
                      <th className="px-4 py-4 font-medium">Customer & Details</th>
                      <th className="px-4 py-4 font-medium">Part Summary</th>
                      <th className="px-4 py-4 font-medium">Financials</th>
                      <th className="px-4 py-4 font-medium">Status & Workflow</th>
                      <th className="px-4 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {orders.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">No orders found.</td></tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-800/40 transition-colors group">
                          <td className="px-4 py-4 font-bold text-white">
                            {order.orderNumber}
                            <div className="text-xs text-gray-500 mt-1 font-normal">Created: {order.orderDate}</div>
                            <div className="text-xs text-gray-500 font-normal">Delivery: {order.deliveryDate}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-emerald-400 font-medium">{order.customerName}</div>
                            <div className="text-xs text-gray-400 mt-1">Rep: {order.salesperson}</div>
                            <div className="text-xs text-gray-500">WH: {order.warehouse}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-white">{order.partNumber}</div>
                            <div className="text-xs text-gray-400">{order.partName}</div>
                            <div className="text-xs text-blue-400 mt-1 font-mono">Qty: {order.quantity} Units</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-white">PKR {order.totalAmount}</div>
                            <div className="text-xs text-gray-500 mt-1">Price: PKR {order.unitPrice}</div>
                            <div className="text-xs text-gray-500">Discount: {order.discount} | Tax: {order.tax}</div>
                          </td>
                          <td className="px-4 py-4 min-w-[280px]">
                            <div className="mb-3">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${order.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : order.status === "Reserved" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : order.status === "Processing" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-gray-800 text-gray-300 border-gray-700"}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 w-full">
                              {workflowSteps.map((step, idx) => {
                                const currentStepIdx = getOrderWorkflowIndex(order.status);
                                const isActive = currentStepIdx !== -1 && idx <= currentStepIdx;
                                return (
                                  <div key={step} className="flex-1 flex flex-col gap-1" title={step}>
                                    <div className={`h-1.5 w-full rounded-full ${isActive ? "bg-emerald-500" : "bg-gray-700"}`}></div>
                                    <span className={`text-[9px] font-medium text-center ${isActive ? "text-emerald-300" : "text-gray-500"}`}>{step}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openOrderModal(order)} className="p-2 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => handleDeleteOrder(order.id)} className="p-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded"><Trash2 className="h-4 w-4" /></button>
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

          {/* --- CUSTOMERS TAB (FULLY FUNCTIONAL) --- */}
          {activeTab === "customers" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col min-h-[85vh]">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Customer Directory</h2>
                  <p className="text-gray-400 text-sm mt-1">Manage all B2B and B2C client accounts, details, and financial terms.</p>
                </div>
                <div className="flex gap-3">
                  <button className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm border border-gray-700">
                    <Filter className="h-4 w-4" /> Filter
                  </button>
                  <button onClick={() => openCustModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm shadow-lg shadow-blue-500/20">
                    <Plus className="h-4 w-4" /> Add Customer
                  </button>
                </div>
              </div>
              
              <div className="overflow-auto flex-1 rounded-lg border border-gray-800 bg-gray-950/50">
                <table className="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0 z-10 border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-4 font-medium">Customer & Type</th>
                      <th className="px-4 py-4 font-medium">Contact Details</th>
                      <th className="px-4 py-4 font-medium">Locations</th>
                      <th className="px-4 py-4 font-medium">Financial Terms</th>
                      <th className="px-4 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {customers.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No customers found. Click "Add Customer" to get started.</td></tr>
                    ) : (
                      customers.map((cust) => (
                        <tr key={cust.id} className="hover:bg-gray-800/40 transition-colors group">
                          <td className="px-4 py-4">
                            <div className="font-bold text-white text-base">{cust.companyName}</div>
                            <div className="text-xs text-gray-500 mt-1 font-mono">Code: {cust.code}</div>
                            <div className="mt-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium border ${cust.customerType === "Wholesale" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : cust.customerType === "Retail" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"}`}>
                                {cust.customerType}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-200">{cust.contactPerson}</div>
                            <div className="text-xs text-gray-400 mt-1">{cust.phone}</div>
                            <div className="text-xs text-gray-400">{cust.email}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-2">
                              <Building2 className="h-3.5 w-3.5 mt-0.5 text-gray-500 flex-shrink-0"/> 
                              <div>
                                <span className="text-xs text-gray-500 block mb-0.5">Billing</span>
                                <span className="text-xs text-gray-300 whitespace-normal max-w-[200px] block">{cust.billingAddress}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 mt-3">
                              <MapPin className="h-3.5 w-3.5 mt-0.5 text-gray-500 flex-shrink-0"/> 
                              <div>
                                <span className="text-xs text-gray-500 block mb-0.5">Shipping</span>
                                <span className="text-xs text-gray-300 whitespace-normal max-w-[200px] block">{cust.shippingAddress}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div><span className="text-gray-500 text-xs">Payment Term:</span> <span className="text-gray-300 ml-1">{cust.paymentTerms}</span></div>
                            <div className="mt-2"><span className="text-gray-500 text-xs">Credit Limit:</span> <span className="font-bold text-emerald-400 ml-1">{cust.creditLimit}</span></div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openCustModal(cust)} className="p-2 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded transition-colors" title="Edit Customer"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => handleDeleteCust(cust.id)} className="p-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded transition-colors" title="Delete Customer"><Trash2 className="h-4 w-4" /></button>
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

      {/* --- MODALS --- */}

      {/* Sales Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{editingOrderId ? "Edit Sales Order" : "Create Sales Order"}</h2>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-gray-400 hover:text-white"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSaveOrder} className="overflow-y-auto p-6 space-y-8 flex-1 custom-scrollbar">
              
              {/* Order Meta */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-4">1. Order Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField label="Order Number" value={orderForm.orderNumber} onChange={(e: any) => setOrderForm({...orderForm, orderNumber: e.target.value})} required />
                  <InputField label="Customer" value={orderForm.customerName} onChange={(e: any) => setOrderForm({...orderForm, customerName: e.target.value})} required />
                  <InputField label="Order Date" type="date" value={orderForm.orderDate} onChange={(e: any) => setOrderForm({...orderForm, orderDate: e.target.value})} required />
                  <InputField label="Delivery Date" type="date" value={orderForm.deliveryDate} onChange={(e: any) => setOrderForm({...orderForm, deliveryDate: e.target.value})} required />
                  <InputField label="Salesperson" value={orderForm.salesperson} onChange={(e: any) => setOrderForm({...orderForm, salesperson: e.target.value})} />
                  <InputField label="Warehouse" value={orderForm.warehouse} onChange={(e: any) => setOrderForm({...orderForm, warehouse: e.target.value})} />
                  
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs font-medium text-gray-400">Order Status</label>
                    <select value={orderForm.status} onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderStatus })} className="bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
                      <option value="Draft">Draft</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Reserved">Reserved</option>
                      <option value="Processing">Processing</option>
                      <option value="Ready to Ship">Ready to Ship</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Line Item */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-4">2. Part Information & Integration</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <InputField label="Part Number" value={orderForm.partNumber} onChange={(e: any) => setOrderForm({...orderForm, partNumber: e.target.value})} required />
                  <div className="col-span-2"><InputField label="Part Name" value={orderForm.partName} onChange={(e: any) => setOrderForm({...orderForm, partName: e.target.value})} required /></div>
                  <InputField label="Quantity Requested" type="number" value={orderForm.quantity} onChange={(e: any) => setOrderForm({...orderForm, quantity: e.target.value})} required />
                  <InputField label="Unit Price" type="number" value={orderForm.unitPrice} onChange={(e: any) => setOrderForm({...orderForm, unitPrice: e.target.value})} required />
                </div>

                {/* Integration Check: Stock Verification logic */}
                {orderForm.quantity && (
                  <div className={`p-5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isShortage ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
                    <div>
                      <h4 className={`text-sm font-bold flex items-center gap-2 ${isShortage ? "text-red-400" : "text-emerald-400"}`}>
                        {isShortage ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        Live Inventory Verification
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 text-xs mt-3">
                        <span className="bg-gray-900 px-3 py-1.5 rounded-md border border-gray-700 text-gray-300">
                          Available Stock: <span className="font-bold text-white ml-1">{availableStock}</span>
                        </span>
                        <span className="bg-gray-900 px-3 py-1.5 rounded-md border border-gray-700 text-gray-300">
                          Reserved Stock: <span className="font-bold text-white ml-1">{reservedStock}</span>
                        </span>
                        <span className={`px-3 py-1.5 rounded-md border font-bold ${isShortage ? "bg-red-950/50 border-red-500/30 text-red-400" : "bg-emerald-950/50 border-emerald-500/30 text-emerald-400"}`}>
                          Shortage: {isShortage ? shortageAmount : 0}
                        </span>
                      </div>
                    </div>
                    {isShortage && (
                      <button type="button" className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors flex-shrink-0 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                        <Factory className="h-4 w-4" /> Create Production Order
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Financials */}
              <div>
                <h3 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-4">3. Financial Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InputField label="Discount (PKR)" type="number" value={orderForm.discount} onChange={(e: any) => setOrderForm({...orderForm, discount: e.target.value})} />
                  <InputField label="Tax (%)" value={orderForm.tax} onChange={(e: any) => setOrderForm({...orderForm, tax: e.target.value})} />
                  <InputField label="Shipping Charges" type="number" value={orderForm.shippingCharges} onChange={(e: any) => setOrderForm({...orderForm, shippingCharges: e.target.value})} />
                  <InputField label="Grand Total (PKR)" type="number" value={orderForm.totalAmount} onChange={(e: any) => setOrderForm({...orderForm, totalAmount: e.target.value})} required />
                </div>
              </div>

            </form>
            <div className="p-6 border-t border-gray-800 bg-gray-950 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-300 hover:bg-gray-800">Cancel</button>
              <button onClick={handleSaveOrder} className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/20"><Save className="h-4 w-4" /> Save Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {isCustModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">{editingCustId ? "Edit Customer Profile" : "Add New Customer"}</h2>
              <button onClick={() => setIsCustModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={handleSaveCust} className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
              
              <div>
                <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4">1. Primary Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Customer Code" value={custForm.code} onChange={(e: any) => setCustForm({...custForm, code: e.target.value})} required placeholder="e.g., CUST-001" />
                  <InputField label="Company Name" value={custForm.companyName} onChange={(e: any) => setCustForm({...custForm, companyName: e.target.value})} required placeholder="e.g., Ali Motors" />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-400">Customer Type</label>
                    <select value={custForm.customerType} onChange={(e) => setCustForm({...custForm, customerType: e.target.value})} className="bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                      <option value="Retail">Retail</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="Distributor">Distributor</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4">2. Contact Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InputField label="Contact Person" value={custForm.contactPerson} onChange={(e: any) => setCustForm({...custForm, contactPerson: e.target.value})} required />
                  <InputField label="Phone Number" value={custForm.phone} onChange={(e: any) => setCustForm({...custForm, phone: e.target.value})} required placeholder="+92 300 0000000" />
                  <InputField label="Email Address" type="email" value={custForm.email} onChange={(e: any) => setCustForm({...custForm, email: e.target.value})} placeholder="contact@company.com" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4">3. Location & Addresses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Billing Address" value={custForm.billingAddress} onChange={(e: any) => setCustForm({...custForm, billingAddress: e.target.value})} required />
                  <InputField label="Shipping Address" value={custForm.shippingAddress} onChange={(e: any) => setCustForm({...custForm, shippingAddress: e.target.value})} required />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider mb-4">4. Financial Terms</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Payment Terms" value={custForm.paymentTerms} onChange={(e: any) => setCustForm({...custForm, paymentTerms: e.target.value})} placeholder="e.g. Net 30, Cash on Delivery" required />
                  <InputField label="Credit Limit (PKR)" value={custForm.creditLimit} onChange={(e: any) => setCustForm({...custForm, creditLimit: e.target.value})} placeholder="e.g. 500,000" required />
                </div>
              </div>

            </form>
            <div className="p-6 border-t border-gray-800 bg-gray-950 flex justify-end gap-3 rounded-b-xl">
              <button type="button" onClick={() => setIsCustModalOpen(false)} className="px-6 py-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors font-medium">Cancel</button>
              <button type="submit" onClick={handleSaveCust} className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-colors"><Save className="h-4 w-4" /> Save Customer</button>
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
    <button onClick={() => onClick(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${isActive ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20" : "text-gray-400 hover:bg-gray-900 hover:text-white"}`}>{icon}{label}</button>
  );
}

function StatCard({ title, value, icon, alert }: { title: string, value: string, icon: React.ReactNode, alert?: boolean }) {
  return (
    <div className={`bg-gray-900 border ${alert ? "border-red-500/30" : "border-gray-800"} p-5 rounded-xl flex flex-col justify-between hover:border-gray-700 transition-colors`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <div className="bg-gray-950 p-2 rounded-lg border border-gray-800">{icon}</div>
      </div>
      <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
    </div>
  );
}

function TopListItem({ rank, name, value, rev }: { rank: string, name: string, value: string, rev: string }) {
  return (
    <li className="flex items-center justify-between bg-gray-950 p-4 rounded-lg border border-gray-800">
      <div className="flex items-center gap-4">
        <span className="text-gray-500 font-bold text-lg w-4">{rank}</span>
        <div><p className="text-white font-medium text-sm">{name}</p><p className="text-gray-500 text-xs mt-0.5">{value}</p></div>
      </div>
      <span className="text-emerald-400 font-bold text-sm">{rev}</span>
    </li>
  );
}

// Chart Sub-Components
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

function WorkflowNode({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  return (
    <div className="flex flex-col items-center z-10 bg-gray-900">
      <div className={`bg-${color}-500/10 border border-${color}-500/30 p-4 rounded-xl mb-3 shadow-[0_0_15px_rgba(var(--color-${color}-500),0.15)]`}>
        {icon}
      </div>
      <span className="text-sm font-bold text-white">{title}</span>
      {desc && <span className="text-xs text-gray-500 mt-1 text-center max-w-[100px]">{desc}</span>}
    </div>
  );
}

function WorkflowArrow() {
  return (
    <div className="flex-1 flex items-center px-2 -mt-8">
      <div className="h-px bg-gray-700 flex-1 relative"></div>
      <ArrowRight className="h-4 w-4 text-gray-600 -ml-1" />
    </div>
  );
}

function InputField({ label, name, value, type = "text", onChange, required, placeholder }: { label: string, name?: string, value: string, type?: string, onChange: any, required?: boolean, placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} name={name} value={value} onChange={onChange} required={required} className="bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all" placeholder={placeholder} />
    </div>
  );
}