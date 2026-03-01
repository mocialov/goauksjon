// Shared filter utilities: category tree, seller categories, mapping helpers
// Centralizing these removes duplication between AuctionTable and parent components.

export const CATEGORY_TREE = [
  { name: 'Animals & Pet Supplies', children: ['Live Animals', 'Pet Supplies'] },
  { name: 'Apparel & Accessories', children: [
    'Clothing','Clothing Accessories','Costumes & Accessories','Handbag & Wallet Accessories','Handbags, Wallets & Cases','Jewelry','Shoe Accessories','Shoes'
  ] },
  { name: 'Arts & Entertainment', children: ['Event Tickets','Hobbies & Creative Arts','Party & Celebration'] },
  { name: 'Baby & Toddler', children: [
    'Baby Bathing','Baby Gift Sets','Baby Health','Baby Safety','Baby Toys & Activity Equipment','Baby Transport','Baby Transport Accessories','Diapering','Nursing & Feeding','Potty Training','Swaddling & Receiving Blankets'
  ] },
  { name: 'Business & Industrial', children: [
    'Advertising & Marketing','Agriculture','Automation Control Components','Construction','Dentistry','Film & Television','Finance & Insurance','Food Service','Forestry & Logging','Hairdressing & Cosmetology','Heavy Machinery','Hotel & Hospitality','Industrial Storage','Industrial Storage Accessories','Janitorial Carts & Caddies','Law Enforcement','Manufacturing','Material Handling','Medical','Mining & Quarrying','Piercing & Tattooing','Retail','Science & Laboratory','Signage','Work Safety Protective Gear'
  ] },
  { name: 'Cameras & Optics', children: ['Camera & Optic Accessories','Cameras','Optics','Photography'] },
  { name: 'Electronics', children: [
    'Arcade Equipment','Audio','Circuit Boards & Components','Communications','Components','Computers','Electronics Accessories','GPS Accessories','GPS Navigation Systems','GPS Tracking Devices','Marine Electronics','Networking','Print, Copy, Scan & Fax','Radar Detectors','Speed Radars','Toll Collection Devices','Video','Video Game Console Accessories','Video Game Consoles'
  ] },
  { name: 'Food, Beverages & Tobacco', children: ['Beverages','Food Items','Tobacco Products'] },
  { name: 'Furniture', children: [
    'Baby & Toddler Furniture','Beds & Accessories','Benches','Cabinets & Storage','Carts & Islands','Chair Accessories','Chairs','Entertainment Centers & TV Stands','Furniture Sets','Futon Frames','Futon Pads','Futons','Office Furniture','Office Furniture Accessories','Ottomans','Outdoor Furniture','Outdoor Furniture Accessories','Room Divider Accessories','Room Dividers','Shelving','Shelving Accessories','Sofa Accessories','Sofas','Table Accessories','Tables'
  ] },
  { name: 'Hardware', children: [
    'Building Consumables','Building Materials','Fencing & Barriers','Fuel','Fuel Containers & Tanks','Hardware Accessories','Hardware Pumps','Heating, Ventilation & Air Conditioning','Locks & Keys','Plumbing','Power & Electrical Supplies','Small Engines','Storage Tanks','Tool Accessories','Tools'
  ] },
  { name: 'Health & Beauty', children: ['Health Care','Jewelry Cleaning & Care','Personal Care'] },
  { name: 'Home & Garden', children: [
    'Bathroom Accessories','Business & Home Security','Decor','Emergency Preparedness','Fireplace & Wood Stove Accessories','Fireplaces','Flood, Fire & Gas Safety','Household Appliance Accessories','Household Appliances','Household Supplies','Kitchen & Dining','Lawn & Garden','Lighting','Lighting Accessories','Linens & Bedding','Parasols & Rain Umbrellas','Plants','Pool & Spa','Smoking Accessories','Umbrella Sleeves & Cases','Wood Stoves'
  ] },
  { name: 'Luggage & Bags', children: [
    'Backpacks','Briefcases','Cosmetic & Toiletry Bags','Diaper Bags','Dry Boxes','Duffel Bags','Fanny Packs','Garment Bags','Luggage Accessories','Messenger Bags','Shopping Totes','Suitcases','Train Cases'
  ] },
  { name: 'Mature', children: ['Erotic','Weapons'] },
  { name: 'Media', children: [
    'Books','Carpentry & Woodworking Project Plans','DVDs & Videos','Magazines & Newspapers','Music & Sound Recordings','Product Manuals','Sheet Music'
  ] },
  { name: 'Office Supplies', children: [
    'Book Accessories','Desk Pads & Blotters','Filing & Organization','General Office Supplies','Impulse Sealers','Lap Desks','Name Plates','Office & Chair Mats','Office Carts','Office Equipment','Office Instruments','Paper Handling','Presentation Supplies','Shipping Supplies'
  ] },
  { name: 'Religious & Ceremonial', children: ['Memorial Ceremony Supplies','Religious Items','Wedding Ceremony Supplies'] },
  { name: 'Software', children: ['Computer Software','Digital Goods & Currency','Video Game Software'] },
  { name: 'Sporting Goods', children: ['Athletics','Exercise & Fitness','Indoor Games','Outdoor Recreation'] },
  { name: 'Toys & Games', children: ['Game Timers','Games','Outdoor Play Equipment','Puzzles','Toys'] },
  { name: 'Vehicles & Parts', children: ['Vehicle Parts & Accessories','Vehicles'] }
]

export const SELLER_CATEGORIES = [
  'Sold by Company',
  'Individual Seller',
  'Auksjonen.no',
  'Konkursbo',
  'Other/Unknown Seller'
]

export const getAllCategories = () => {
  const set = new Set()
  CATEGORY_TREE.forEach(parent => {
    set.add(parent.name)
    parent.children.forEach(child => set.add(child))
  })
  return Array.from(set).sort()
}

export const mapSellerToCategory = (seller) => {
  if (!seller || seller.trim() === '') return 'Other/Unknown Seller'
  const sellerLower = seller.toLowerCase().trim()
  
  // Check if seller is already labeled as "Individual Seller"
  if (sellerLower === 'individual seller') return 'Individual Seller'
  
  if (sellerLower.includes('auksjonen')) return 'Auksjonen.no'
  if (sellerLower.includes('konkursbo') || sellerLower.includes('konkurs')) return 'Konkursbo'
  if (/( as$| asa$| ltd$| inc$| corp$| ab$|company|firma)/i.test(' ' + sellerLower)) return 'Sold by Company'
  
  const hasPersonalName = /\b(ole|lars|per|knut|jan|erik|bjørn|arne|kjell|svein|tom|john|harald|geir|tor|odd|gunnar|rune|even|stein|morten|kristian|thomas|andreas|martin|daniel|fredrik|henrik|christian|robert|anders|bjarne|terje|magnus|øyvind|helge|espen|kari|anne|inger|marit|liv|astrid|solveig|eva|berit|gerd|britt|hilde|linda|nina|tone|camilla|lene|mari|silje|stine|hanne|elisabeth|ingrid|monica|tove|kristin|gunn)\b/i
  if (hasPersonalName.test(sellerLower)) return 'Individual Seller'
  
  return 'Other/Unknown Seller'
}

// Optional helper to find parent category of a given category name (supports "Parent: Child" format)
export const findParentCategory = (categoryName) => {
  if (!categoryName) return null
  if (categoryName.includes(':')) {
    const [parentPart, childPart] = categoryName.split(':').map(s => s.trim())
    const parentNode = CATEGORY_TREE.find(p => p.name === parentPart)
    if (parentNode && parentNode.children.includes(childPart)) return parentPart
  }
  for (const parent of CATEGORY_TREE) {
    if (parent.name === categoryName) return null
    if (parent.children.includes(categoryName)) return parent.name
  }
  return null
}
