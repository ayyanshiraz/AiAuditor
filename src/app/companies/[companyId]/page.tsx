"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function ModulesHub() {
  const params = useParams();
  const companyId = params.companyId || params.id;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Changed text-white to text-black here */}
      <h1 className="text-3xl font-bold text-black mb-8">Select a Module</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link 
          href={`/companies/${companyId}/dashboard`}
          className="bg-gray-900 border border-gray-800 p-8 rounded-xl block hover:border-blue-500 transition-colors"
        >
          <h2 className="text-2xl font-bold text-white mb-2">AI Auditor</h2>
          <p className="text-gray-400">Open the auditor tools.</p>
        </Link>

        <Link 
          href={`/companies/${companyId}/inventory`}
          className="bg-gray-900 border border-gray-800 p-8 rounded-xl block hover:border-green-500 transition-colors"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Inventory</h2>
          <p className="text-gray-400">Manage company stock.</p>
        </Link>

        <Link 
          href={`/companies/${companyId}/shipping`}
          className="bg-gray-900 border border-gray-800 p-8 rounded-xl block hover:border-purple-500 transition-colors"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Shipping</h2>
          <p className="text-gray-400">Manage deliveries and logistics.</p>
        </Link>

        <Link 
          href={`/companies/${companyId}/sales`}
          className="bg-gray-900 border border-gray-800 p-8 rounded-xl block hover:border-emerald-500 transition-colors"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Sales</h2>
          <p className="text-gray-400">Manage orders and quotations.</p>
        </Link>

        <Link 
          href={`/companies/${companyId}/production`}
          className="bg-gray-900 border border-gray-800 p-8 rounded-xl block hover:border-orange-500 transition-colors"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Production</h2>
          <p className="text-gray-400">Manage manufacturing and assembly.</p>
        </Link>
      </div>
    </div>
  );
}