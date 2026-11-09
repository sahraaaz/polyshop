export const tiers = [
  { key: 'rookie', title: 'Rookie', fa: 'تازه‌وارد', min: 0, avatar: '🌱', color: 'turquoise' },
  { key: 'explorer', title: 'Explorer', fa: 'جست‌وجوگر', min: 60, avatar: '🐣', color: 'orange' },
  { key: 'maker', title: 'Maker', fa: 'سازنده', min: 150, avatar: '🐥', color: 'pink' },
  { key: 'campus-star', title: 'Campus Star', fa: 'ستارهٔ دانشگاه', min: 300, avatar: '🦊', color: 'blue' },
  { key: 'legend', title: 'Poly Legend', fa: 'افسانهٔ Polyshop', min: 600, avatar: '🦁', color: 'mix' },
]

export function getTierProfile(name, { orders = [], reviews = [], catalog = [], ideas = [], communityMessages = [] } = {}) {
  if (!name) return { ...tiers[0], score: 0, progress: 0, next: tiers[1] }
  const completedSpend = orders.filter((order) => order.buyer === name && order.status === 'completed').reduce((sum, order) => sum + order.amount, 0)
  const purchases = Math.min(220, Math.floor(completedSpend / 100000) * 5)
  const listings = catalog.filter((item) => item.seller === name && item.status === 'approved').length * 20
  const usefulReviews = reviews.filter((review) => review.author === name && review.status === 'approved').length * 15
  const ownIdeas = ideas.filter((idea) => idea.author === name)
  const ideaPosts = ownIdeas.length * 25
  const likesReceived = ownIdeas.reduce((sum, idea) => sum + (idea.likes?.length || 0), 0) * 2
  const ownComments = ideas.flatMap((idea) => idea.comments || []).filter((comment) => comment.author === name)
  const comments = ownComments.length * 3
  const commentLikes = ownComments.reduce((sum, comment) => sum + (comment.likes?.length || 0), 0) * 4
  const chat = Math.min(30, communityMessages.filter((message) => message.author === name).length * 2)
  const score = purchases + listings + usefulReviews + ideaPosts + likesReceived + comments + commentLikes + chat
  const current = [...tiers].reverse().find((tier) => score >= tier.min) || tiers[0]
  const index = tiers.findIndex((tier) => tier.key === current.key)
  const next = tiers[index + 1] || null
  const progress = next ? Math.min(100, Math.round(((score - current.min) / (next.min - current.min)) * 100)) : 100
  return { ...current, score, progress, next }
}
