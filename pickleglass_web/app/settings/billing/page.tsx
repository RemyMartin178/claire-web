'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'

export default function BillingPage() {
  const tabs = [
    { id: 'profile', name: 'Profil personnel', href: '/settings' },
    { id: 'security', name: 'Sécurité', href: '/settings/security' },
    { id: 'privacy', name: 'Données et confidentialité', href: '/settings/privacy' },
    { id: 'billing', name: 'Facturation', href: '/settings/billing' },
  ]

  return (
    <div className="bg-transparent min-h-screen text-white animate-fade-in">
      <div className="px-8 py-8">
        <div className="mb-6">
          <p className="text-xs text-white mb-1">Paramètres</p>
          <h1 className="text-3xl font-bold text-white">Paramètres personnels</h1>
        </div>
        
        <div className="mb-8">
          <nav className="flex space-x-10">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  tab.id === 'billing'
                    ? 'border-[#9ca3af] text-white'
                    : 'border-transparent text-white hover:text-[#9ca3af] hover:border-[#9ca3af]'
                }`}
              >
                {tab.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Plan Gratuit */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gratuit</h3>
              <div className="text-3xl font-bold text-gray-900">
                $0<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Experience how Pickle Glass works with unlimited responses.
            </p>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Daily unlimited responses</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Unlimited access to free models</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Unlimited text output</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Screen viewing, audio listening</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Custom system prompts</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Community support only</span>
              </li>
            </ul>
            
            <button className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-md font-medium">
              Current Plan
            </button>
          </div>

          {/* Plan Pro */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-60">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Pro</h3>
              <div className="text-3xl font-bold text-gray-900">
                $25<span className="text-lg font-normal text-gray-600">/month</span>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Use latest models, get full response output, and work with custom prompts.
            </p>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Unlimited pro responses</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Unlimited access to latest models</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Full access to conversation dashboard</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">Priority support</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-700">All features from free plan</span>
              </li>
            </ul>
            
            <button className="w-full py-2 px-4 bg-cyan-400 text-white rounded-md font-medium">
              Coming Soon
            </button>
          </div>

          {/* Plan Enterprise */}
          <div className="bg-gray-800 text-white rounded-lg p-6 opacity-60">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
              <div className="text-xl font-semibold">Custom</div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Specially crafted for teams that need complete customization.
            </p>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-300">Custom integrations</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-300">User provisioning & role-based access</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-300">Advanced post-call analytics</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-300">Single sign-on</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-300">Advanced security features</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-300">Centralized billing</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-5 w-5 text-[#9ca3af]" />
                <span className="text-sm text-gray-300">Usage analytics & reporting dashboard</span>
              </li>
            </ul>
            
            <button className="w-full py-2 px-4 bg-gray-600 text-white rounded-md font-medium">
              Coming Soon
            </button>
          </div>
        </div>

        {/* Message d'information */}
        <div className="bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Check className="h-6 w-6 text-[#9ca3af]" />
            <div>
              <h4 className="font-semibold text-white">All features are currently free!</h4>
              <p className="text-[#9ca3af] text-sm">
                Enjoy all Pickle Glass features for free. Pro and Enterprise plans will be released soon with additional premium features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
