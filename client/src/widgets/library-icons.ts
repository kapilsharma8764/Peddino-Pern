import { getIcon } from '@/blocks/icons'
const icons:Record<string,string>={Basic:'Type',Layout:'Layout',Navigation:'Navigation',Media:'Image',Forms:'Mail',Interactive:'MousePointer',Marketing:'Megaphone',Business:'Briefcase',Blog:'FileText',Ecommerce:'ShoppingCart',Social:'Share2',Data:'BarChart3',Advanced:'Code'}
export const categoryIcon = (category:string) => getIcon(icons[category] ?? 'Layout')
