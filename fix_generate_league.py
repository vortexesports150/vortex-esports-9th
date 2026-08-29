import re

with open('src/components/GenerateLeagueView.tsx', 'r') as f:
    content = f.read()

# First, add the state for subscription config if it doesn't exist
if 'subscriptionConfig' not in content:
    target = 'const [isGenerating, setIsGenerating] = useState(false);'
    replacement = target + """
  const [subscriptionConfig, setSubscriptionConfig] = useState<any>({ monthlyFee: 300, yearlyFee: 1500, apexFee: 10000 });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'proHostSubscriptions'));
        if (snap.exists()) {
          setSubscriptionConfig(snap.data());
        }
      } catch(err) {}
    };
    fetchConfig();
  }, []);
"""
    content = content.replace(target, replacement)


# Replace handleSubscribe cost calculation
old_sub_cost = "const cost = type === 'apex' ? 10000 : type === 'monthly' ? 200 : 1000;"
new_sub_cost = "const cost = type === 'apex' ? subscriptionConfig.apexFee : type === 'monthly' ? subscriptionConfig.monthlyFee : subscriptionConfig.yearlyFee;"
content = content.replace(old_sub_cost, new_sub_cost)

# Add transaction logic to create pro_host_subscriptions document
old_transaction = """        transaction.update(userRef, {
          tokens: tokens - cost,
          proHostSubscription: {
            type,
            expiresAt: expiresAt.toISOString()
          }
        });
      });"""

new_transaction = """        transaction.update(userRef, {
          tokens: tokens - cost,
          proHostSubscription: {
            type,
            expiresAt: expiresAt.toISOString()
          }
        });
        
        const subRef = doc(collection(db, 'pro_host_subscriptions'));
        transaction.set(subRef, {
          userId: userProfile.userId,
          username: userProfile.displayName || '',
          email: userProfile.email || '',
          type,
          expiresAt: expiresAt.toISOString(),
          subscribedAt: new Date().toISOString(),
          tokensPaid: cost
        });
      });"""
content = content.replace(old_transaction, new_transaction)

# Replace the HTML for tokens in the modal
content = re.sub(r'200 <span className="text-sm font-normal text-slate-400">Tokens</span>', 
                 r'{subscriptionConfig.monthlyFee} <span className="text-sm font-normal text-slate-400">Tokens</span>', content)

content = re.sub(r'1000 <span className="text-sm font-normal text-slate-400">Tokens</span>', 
                 r'{subscriptionConfig.yearlyFee} <span className="text-sm font-normal text-slate-400">Tokens</span>', content)

content = re.sub(r'10000 <span className="text-sm font-normal text-slate-400">Tokens</span>', 
                 r'{subscriptionConfig.apexFee} <span className="text-sm font-normal text-slate-400">Tokens</span>', content)

with open('src/components/GenerateLeagueView.tsx', 'w') as f:
    f.write(content)
