<template>
  <div>
    <!-- Header -->
    <div class="@container mb-6">
      <div
        class="flex flex-col gap-4 @2xl:flex-row @2xl:items-start @2xl:justify-between"
      >
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-bold @md:text-2xl">
            {{ wishlistData?.name || 'Wunschliste' }}
          </h2>
          <p class="text-muted-foreground mt-2 text-sm @md:text-base">
            {{ wishlistData?.description || 'Artikel in dieser Wunschliste' }}
          </p>
        </div>
        <div class="flex flex-col gap-2 @md:flex-row @2xl:flex-shrink-0">
          <CreateWishlistItemModal
            :wishlist-id="wishlistId"
            @created="onItemCreated"
            class="w-full @md:w-auto"
          />

          <!-- More Actions Dropdown -->
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" class="w-full @md:w-auto">
                <MoreHorizontal class="mr-2 h-4 w-4" />
                <span class="@max-lg:hidden">Aktionen</span>
                <span class="@lg:hidden">Mehr</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-48">
              <DropdownMenuItem
                @click="openEditWishlistModal"
                class="cursor-pointer"
              >
                <Edit2 class="mr-2 h-4 w-4" />
                Wishlist bearbeiten
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                @click="confirmDeleteWishlist"
                class="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 class="mr-2 h-4 w-4" />
                Wishlist löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            @click="router.push('/tools/wishlists')"
            variant="outline"
            class="w-full @md:w-auto"
          >
            <span class="@max-xl:hidden">Zurück zur Übersicht</span>
            <span class="@xl:hidden">Zurück</span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="space-y-4">
      <div class="bg-muted h-12 animate-pulse rounded"></div>
      <div class="bg-muted h-32 animate-pulse rounded"></div>
      <div class="bg-muted h-32 animate-pulse rounded"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="py-12 text-center">
      <div class="text-destructive">
        <p class="text-lg font-semibold">Fehler beim Laden</p>
        <p class="text-muted-foreground mt-2">{{ error }}</p>
        <Button @click="fetchItems" variant="outline" class="mt-4">
          Nochmal versuchen
        </Button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="items.length === 0" class="py-12 text-center">
      <div class="text-muted-foreground space-y-4">
        <div>
          <FileText class="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
          <p class="text-lg">Keine Artikel vorhanden</p>
          <p>Diese Wunschliste ist noch leer.</p>
        </div>
        <CreateWishlistItemModal
          :wishlist-id="wishlistId"
          @created="onItemCreated"
        >
          <template #trigger>
            <Button> Ersten Artikel hinzufügen </Button>
          </template>
        </CreateWishlistItemModal>
      </div>
    </div>

    <!-- Items Table -->
    <div v-else class="@container space-y-4">
      <!-- Filters -->
      <div
        class="space-y-4 @2xl:flex @2xl:items-start @2xl:justify-between @2xl:space-y-0"
      >
        <!-- Left side: Filter and count -->
        <div
          class="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:gap-4"
        >
          <div class="flex items-center gap-2">
            <label class="shrink-0 text-sm font-medium">Filter:</label>
            <Select v-model="filter">
              <SelectTrigger class="w-full min-w-0 @sm:w-48 @lg:w-56">
                <SelectValue placeholder="Alle anzeigen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle anzeigen</SelectItem>
                <SelectItem value="active">Nur aktive</SelectItem>
                <SelectItem value="purchased">Gekauft</SelectItem>
                <SelectItem value="unpurchased">Noch nicht gekauft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div
            class="text-muted-foreground shrink-0 text-sm @lg:border-l @lg:pl-4"
          >
            {{ filteredItems.length }} von {{ items.length }} Artikel{{
              items.length !== 1 ? 'n' : ''
            }}
          </div>
        </div>

        <!-- Right side: Price Summary -->
        <div
          v-if="items.length > 0"
          class="text-sm font-medium @2xl:flex-shrink-0 @2xl:text-right"
        >
          <div
            class="flex flex-col gap-1 @md:flex-row @md:items-center @md:gap-3 @2xl:flex-col @2xl:items-end @2xl:gap-0"
          >
            <div class="flex items-center gap-2 @2xl:justify-end">
              <span class="text-muted-foreground shrink-0">Gesamtwert:</span>
              <span class="font-semibold">{{ formatPrice(totalSum) }}</span>
            </div>
            <div
              v-if="activeSum !== totalSum"
              class="text-muted-foreground text-xs @2xl:text-sm"
            >
              ({{ formatPrice(activeSum) }} aktiv)
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Rich Table -->
      <div class="@container overflow-hidden rounded-lg border">
        <!-- Desktop Table Header -->
        <div class="bg-muted/50 border-b px-6 py-4 @max-3xl:hidden">
          <div class="grid grid-cols-14 items-center gap-4 text-sm font-medium">
            <div class="col-span-1">Bild</div>
            <div class="col-span-5">Name & Beschreibung</div>
            <div class="col-span-2">Preis</div>
            <div class="col-span-2">Priorität</div>
            <div class="col-span-2">Status</div>
            <div class="col-span-2">Aktionen</div>
          </div>
        </div>

        <!-- Table Body -->
        <div class="divide-y">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            class="hover:bg-muted/20 transition-colors"
            :class="{ 'opacity-60': !item.isActive || item.isPurchased }"
          >
            <!-- Desktop Row Layout -->
            <div
              class="grid grid-cols-14 items-center gap-4 px-6 py-4 @max-3xl:hidden"
            >
              <!-- Image -->
              <div class="col-span-1">
                <div
                  class="bg-muted flex h-12 w-12 items-center justify-center overflow-hidden rounded border"
                >
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.name"
                    class="h-full w-full object-cover"
                    @error="handleImageError"
                  />
                  <Package v-else class="text-muted-foreground h-6 w-6" />
                </div>
              </div>

              <!-- Name & Description -->
              <div class="col-span-5 min-w-0">
                <div class="truncate font-medium" :title="item.name">
                  {{ item.name }}
                </div>
                <div
                  v-if="item.description"
                  class="text-muted-foreground mt-1 line-clamp-2 text-sm"
                >
                  {{ item.description }}
                </div>
                <div
                  v-if="item.notes"
                  class="text-muted-foreground mt-1 text-xs italic"
                >
                  Notiz: {{ item.notes }}
                </div>
              </div>

              <!-- Price -->
              <div class="col-span-2">
                <div v-if="item.price" class="font-medium">
                  {{ formatPrice(item.price) }}
                </div>
                <div v-else class="text-muted-foreground text-sm">
                  Kein Preis
                </div>
              </div>

              <!-- Priority -->
              <div class="col-span-2">
                <div class="flex items-center gap-2">
                  <div class="flex">
                    <Star
                      v-for="star in 5"
                      :key="star"
                      class="h-4 w-4"
                      :class="
                        star <= (item.priority || 0)
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-muted-foreground'
                      "
                    />
                  </div>
                  <span class="text-muted-foreground text-xs">
                    ({{ item.priority || 0 }})
                  </span>
                </div>
              </div>

              <!-- Status -->
              <div class="col-span-2">
                <div class="flex flex-col gap-1">
                  <Badge
                    v-if="item.isPurchased"
                    variant="default"
                    class="flex w-fit items-center gap-1"
                  >
                    <CheckCircle class="h-3 w-3" />
                    Gekauft
                  </Badge>
                  <Badge
                    v-else-if="!item.isActive"
                    variant="secondary"
                    class="flex w-fit items-center gap-1"
                  >
                    <Pause class="h-3 w-3" />
                    Inaktiv
                  </Badge>
                  <Badge
                    v-else
                    variant="outline"
                    class="flex w-fit items-center gap-1"
                  >
                    <ShoppingCart class="h-3 w-3" />
                    Aktiv
                  </Badge>
                </div>
              </div>

              <!-- Actions -->
              <div class="col-span-2">
                <div class="flex items-center gap-2">
                  <!-- Primary Action: Link -->
                  <Button
                    v-if="item.url"
                    @click="openUrl(item.url)"
                    size="sm"
                    variant="outline"
                    class="flex items-center gap-1"
                  >
                    <ExternalLink class="h-3 w-3" />
                    Link
                  </Button>

                  <!-- Secondary Actions Dropdown -->
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" class="h-8 w-8 p-0">
                        <MoreHorizontal class="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-48">
                      <!-- Edit Action -->
                      <DropdownMenuItem
                        @click="openEditModal(item)"
                        class="cursor-pointer"
                      >
                        <Edit2 class="mr-2 h-4 w-4" />
                        Bearbeiten
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <!-- Purchase Toggle -->
                      <DropdownMenuItem
                        v-if="!item.isPurchased"
                        @click="togglePurchased(item.id, true)"
                        class="cursor-pointer"
                      >
                        <CheckCircle class="mr-2 h-4 w-4" />
                        Als gekauft markieren
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-else
                        @click="togglePurchased(item.id, false)"
                        class="cursor-pointer"
                      >
                        <UndoIcon class="mr-2 h-4 w-4" />
                        Rückgängig machen
                      </DropdownMenuItem>

                      <!-- Active Toggle -->
                      <DropdownMenuItem
                        @click="toggleActive(item.id, !item.isActive)"
                        class="cursor-pointer"
                      >
                        <Play v-if="!item.isActive" class="mr-2 h-4 w-4" />
                        <Pause v-else class="mr-2 h-4 w-4" />
                        {{ item.isActive ? 'Deaktivieren' : 'Aktivieren' }}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <!-- Delete Action -->
                      <DropdownMenuItem
                        @click="confirmDeleteItem(item)"
                        class="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 class="mr-2 h-4 w-4" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <!-- Mobile Card Layout -->
            <div class="space-y-4 p-4 @3xl:hidden">
              <!-- Header with Image and Name -->
              <div class="flex items-start gap-3">
                <div
                  class="bg-muted flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border"
                >
                  <img
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.name"
                    class="h-full w-full object-cover"
                    @error="handleImageError"
                  />
                  <Package v-else class="text-muted-foreground h-6 w-6" />
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="leading-tight font-medium" :title="item.name">
                    {{ item.name }}
                  </h3>
                  <div
                    v-if="item.description"
                    class="text-muted-foreground mt-1 line-clamp-2 text-sm"
                  >
                    {{ item.description }}
                  </div>
                  <div
                    v-if="item.notes"
                    class="text-muted-foreground mt-1 text-xs italic"
                  >
                    Notiz: {{ item.notes }}
                  </div>
                </div>
              </div>

              <!-- Details Grid -->
              <div class="grid grid-cols-1 gap-3 @sm:grid-cols-2">
                <!-- Price -->
                <div
                  class="flex items-center justify-between @sm:flex-col @sm:items-start @sm:justify-start"
                >
                  <span class="text-muted-foreground text-sm font-medium"
                    >Preis</span
                  >
                  <div v-if="item.price" class="font-medium">
                    {{ formatPrice(item.price) }}
                  </div>
                  <div v-else class="text-muted-foreground text-sm">
                    Kein Preis
                  </div>
                </div>

                <!-- Priority -->
                <div
                  class="flex items-center justify-between @sm:flex-col @sm:items-start @sm:justify-start"
                >
                  <span class="text-muted-foreground text-sm font-medium"
                    >Priorität</span
                  >
                  <div class="flex items-center gap-2">
                    <div class="flex">
                      <Star
                        v-for="star in 5"
                        :key="star"
                        class="h-4 w-4"
                        :class="
                          star <= (item.priority || 0)
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-muted-foreground'
                        "
                      />
                    </div>
                    <span class="text-muted-foreground text-xs">
                      ({{ item.priority || 0 }})
                    </span>
                  </div>
                </div>

                <!-- Status -->
                <div
                  class="flex items-center justify-between @sm:flex-col @sm:items-start @sm:justify-start"
                >
                  <span class="text-muted-foreground text-sm font-medium"
                    >Status</span
                  >
                  <div>
                    <Badge
                      v-if="item.isPurchased"
                      variant="default"
                      class="flex w-fit items-center gap-1"
                    >
                      <CheckCircle class="h-3 w-3" />
                      Gekauft
                    </Badge>
                    <Badge
                      v-else-if="!item.isActive"
                      variant="secondary"
                      class="flex w-fit items-center gap-1"
                    >
                      <Pause class="h-3 w-3" />
                      Inaktiv
                    </Badge>
                    <Badge
                      v-else
                      variant="outline"
                      class="flex w-fit items-center gap-1"
                    >
                      <ShoppingCart class="h-3 w-3" />
                      Aktiv
                    </Badge>
                  </div>
                </div>

                <!-- Actions -->
                <div
                  class="flex items-center justify-between @sm:flex-col @sm:items-start @sm:justify-start"
                >
                  <span class="text-muted-foreground text-sm font-medium"
                    >Aktionen</span
                  >
                  <div class="flex items-center gap-2">
                    <!-- Primary Action: Link -->
                    <Button
                      v-if="item.url"
                      @click="openUrl(item.url)"
                      size="sm"
                      variant="outline"
                      class="flex items-center gap-1"
                    >
                      <ExternalLink class="h-3 w-3" />
                      Link
                    </Button>

                    <!-- Secondary Actions Dropdown -->
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" class="h-8 w-8 p-0">
                          <MoreHorizontal class="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" class="w-48">
                        <!-- Edit Action -->
                        <DropdownMenuItem
                          @click="openEditModal(item)"
                          class="cursor-pointer"
                        >
                          <Edit2 class="mr-2 h-4 w-4" />
                          Bearbeiten
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <!-- Purchase Toggle -->
                        <DropdownMenuItem
                          v-if="!item.isPurchased"
                          @click="togglePurchased(item.id, true)"
                          class="cursor-pointer"
                        >
                          <CheckCircle class="mr-2 h-4 w-4" />
                          Als gekauft markieren
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          v-else
                          @click="togglePurchased(item.id, false)"
                          class="cursor-pointer"
                        >
                          <UndoIcon class="mr-2 h-4 w-4" />
                          Rückgängig machen
                        </DropdownMenuItem>

                        <!-- Active Toggle -->
                        <DropdownMenuItem
                          @click="toggleActive(item.id, !item.isActive)"
                          class="cursor-pointer"
                        >
                          <Play v-if="!item.isActive" class="mr-2 h-4 w-4" />
                          <Pause v-else class="mr-2 h-4 w-4" />
                          {{ item.isActive ? 'Deaktivieren' : 'Aktivieren' }}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <!-- Delete Action -->
                        <DropdownMenuItem
                          @click="confirmDeleteItem(item)"
                          class="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 class="mr-2 h-4 w-4" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.total > pagination.limit"
        class="flex items-center justify-between pt-4"
      >
        <div class="text-muted-foreground text-sm">
          Zeige {{ pagination.offset + 1 }} bis
          {{ Math.min(pagination.offset + pagination.limit, pagination.total) }}
          von {{ pagination.total }} Artikeln
        </div>
        <div class="flex gap-2">
          <Button
            @click="loadPreviousPage"
            :disabled="pagination.offset === 0"
            variant="outline"
            size="sm"
          >
            Vorherige
          </Button>
          <Button
            @click="loadNextPage"
            :disabled="!pagination.hasMore"
            variant="outline"
            size="sm"
          >
            Nächste
          </Button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <EditWishlistItemModal
      :item="editingItem || defaultItem"
      v-model="isEditModalOpen"
      :show-trigger="false"
      @updated="onItemUpdated"
      @update:model-value="handleEditModalClose"
    />

    <!-- Edit Wishlist Modal -->
    <EditWishlistModal
      v-if="wishlistData"
      :wishlist="wishlistData"
      v-model="isEditWishlistModalOpen"
      :show-trigger="false"
      @updated="onWishlistUpdated"
    />

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="deleteDialog.open">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Artikel löschen</AlertDialogTitle>
          <AlertDialogDescription>
            Sind Sie sicher, dass Sie den Artikel "{{
              deleteDialog.item?.name
            }}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht
            werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            @click="deleteItem"
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="deleteDialog.loading"
          >
            <span v-if="deleteDialog.loading">Löscht...</span>
            <span v-else>Löschen</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- Delete Wishlist Confirmation Dialog -->
    <AlertDialog v-model:open="deleteWishlistDialog.open">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Wishlist löschen</AlertDialogTitle>
          <AlertDialogDescription>
            Sind Sie sicher, dass Sie die Wishlist "{{ wishlistData?.name }}"
            löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden
            und alle Artikel in dieser Wishlist werden ebenfalls gelöscht.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            @click="deleteWishlist"
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="deleteWishlistDialog.loading"
          >
            <span v-if="deleteWishlistDialog.loading">Löscht...</span>
            <span v-else>Löschen</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import CreateWishlistItemModal from './CreateWishlistItemModal.vue'
import EditWishlistItemModal from './EditWishlistItemModal.vue'
import EditWishlistModal from './EditWishlistModal.vue'
import { toast } from 'vue-sonner'
import { formatPrice, handleImageError } from '@/lib/wishlists/helpers'
import {
  Package,
  ExternalLink,
  CheckCircle,
  UndoIcon,
  Play,
  Pause,
  Star,
  StarOff,
  FileText,
  ShoppingCart,
  Edit2,
  MoreHorizontal,
  Trash2,
} from 'lucide-vue-next'

interface WishlistItem {
  id: string
  wishlistId: string
  name: string
  description?: string
  price?: number
  url: string
  imageUrl?: string
  isActive: boolean
  isPurchased: boolean
  priority?: number
  notes?: string
  createdAt: string
  updatedAt?: string
}

interface Wishlist {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt?: string
}

interface ApiResponse {
  success: boolean
  data: WishlistItem[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

const router = useRouter()
const route = useRoute()
const wishlistId = computed(() => route.params.id as string)

// Inject sidebar refresh function
const refreshSidebar = inject<() => void>('refreshSidebar')

// State
const items = ref<WishlistItem[]>([])
const wishlistData = ref<Wishlist | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const filter = ref('all')
const editingItem = ref<WishlistItem | null>(null)
const isEditModalOpen = ref(false)
const pagination = ref({
  limit: 20,
  offset: 0,
  total: 0,
  hasMore: false,
})

// Delete dialog state
const deleteDialog = ref({
  open: false,
  loading: false,
  item: null as WishlistItem | null,
})

// Delete wishlist dialog state
const deleteWishlistDialog = ref({
  open: false,
  loading: false,
})

// Edit wishlist modal state
const isEditWishlistModalOpen = ref(false)

// Create a default item for when no item is being edited
const defaultItem: WishlistItem = {
  id: '',
  wishlistId: '',
  name: '',
  description: '',
  price: 0,
  url: '',
  imageUrl: '',
  isActive: true,
  isPurchased: false,
  priority: 3,
  notes: '',
  createdAt: '',
  updatedAt: '',
}

// Computed
const filteredItems = computed(() => {
  let filtered = items.value

  switch (filter.value) {
    case 'active':
      filtered = filtered.filter((item) => item.isActive && !item.isPurchased)
      break
    case 'purchased':
      filtered = filtered.filter((item) => item.isPurchased)
      break
    case 'unpurchased':
      filtered = filtered.filter((item) => !item.isPurchased)
      break
    default:
      // 'all' - no filtering
      break
  }

  return filtered
})

// Price totals
const totalSum = computed(() => {
  return items.value.reduce((sum, item) => {
    return sum + (item.price || 0)
  }, 0)
})

const activeSum = computed(() => {
  return items.value
    .filter((item) => item.isActive && !item.isPurchased)
    .reduce((sum, item) => {
      return sum + (item.price || 0)
    }, 0)
})

// Methods
const fetchWishlist = async () => {
  try {
    const response = await fetch(`/api/wishlists/${wishlistId.value}`)
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        wishlistData.value = data.data
      }
    }
  } catch (err) {
    console.error('Error fetching wishlist:', err)
  }
}

const fetchItems = async () => {
  try {
    loading.value = true
    error.value = null

    const params = new URLSearchParams({
      limit: pagination.value.limit.toString(),
      offset: pagination.value.offset.toString(),
    })

    const response = await fetch(
      `/api/wishlists/${wishlistId.value}/items?${params}`,
    )
    const data: ApiResponse = await response.json()

    if (data.success) {
      items.value = data.data
      pagination.value = data.pagination
    } else {
      error.value = 'Fehler beim Laden der Artikel'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unbekannter Fehler'
  } finally {
    loading.value = false
  }
}

const togglePurchased = async (itemId: string, purchased: boolean) => {
  try {
    const response = await fetch(
      `/api/wishlists/${wishlistId.value}/items/${itemId}/purchase`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPurchased: purchased }),
      },
    )

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        // Update local state
        const itemIndex = items.value.findIndex((item) => item.id === itemId)
        if (itemIndex !== -1) {
          items.value[itemIndex].isPurchased = purchased
          toast.success(
            purchased
              ? 'Artikel als gekauft markiert!'
              : 'Artikel als nicht gekauft markiert!',
          )
        }
      }
    } else {
      toast.error('Fehler beim Aktualisieren des Kaufstatus')
    }
  } catch (err) {
    console.error('Error updating purchase status:', err)
    toast.error('Fehler beim Aktualisieren des Kaufstatus')
  }
}

const toggleActive = async (itemId: string, active: boolean) => {
  try {
    const response = await fetch(
      `/api/wishlists/${wishlistId.value}/items/${itemId}/active`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: active }),
      },
    )

    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        // Update local state
        const itemIndex = items.value.findIndex((item) => item.id === itemId)
        if (itemIndex !== -1) {
          items.value[itemIndex].isActive = active
          toast.success(active ? 'Artikel aktiviert!' : 'Artikel deaktiviert!')
        }
      }
    } else {
      toast.error('Fehler beim Aktualisieren des Aktivitätsstatus')
    }
  } catch (err) {
    console.error('Error updating active status:', err)
    toast.error('Fehler beim Aktualisieren des Aktivitätsstatus')
  }
}

const openUrl = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}

const openEditModal = (item: WishlistItem) => {
  editingItem.value = item
  isEditModalOpen.value = true
}

const handleEditModalClose = (isOpen: boolean) => {
  isEditModalOpen.value = isOpen
  if (!isOpen) {
    editingItem.value = null
  }
}

const loadNextPage = () => {
  if (pagination.value.hasMore) {
    pagination.value.offset += pagination.value.limit
    fetchItems()
  }
}

const loadPreviousPage = () => {
  if (pagination.value.offset > 0) {
    pagination.value.offset = Math.max(
      0,
      pagination.value.offset - pagination.value.limit,
    )
    fetchItems()
  }
}

const onItemCreated = (newItem: WishlistItem) => {
  // Add the new item to the beginning of the list
  items.value.unshift(newItem)

  // Update pagination total
  pagination.value.total += 1

  // Optionally refresh the list to ensure consistency
  // fetchItems()
}

const onItemUpdated = (updatedItem: WishlistItem) => {
  // Find and update the item in the list
  const itemIndex = items.value.findIndex((item) => item.id === updatedItem.id)
  if (itemIndex !== -1) {
    items.value[itemIndex] = updatedItem
  }
}

// Confirm delete item
const confirmDeleteItem = (item: WishlistItem) => {
  deleteDialog.value.item = item
  deleteDialog.value.open = true
}

// Delete item
const deleteItem = async () => {
  if (!deleteDialog.value.item) return

  try {
    deleteDialog.value.loading = true

    const response = await fetch(
      `/api/wishlists/${wishlistId.value}/items/${deleteDialog.value.item.id}`,
      {
        method: 'DELETE',
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || 'API returned success: false')
    }

    // Remove item from the list
    items.value = items.value.filter(
      (item) => item.id !== deleteDialog.value.item!.id,
    )

    // Update pagination total
    pagination.value.total = Math.max(0, pagination.value.total - 1)

    // Show success message
    toast.success('Artikel erfolgreich gelöscht')

    // Close dialog
    deleteDialog.value.open = false
    deleteDialog.value.item = null
  } catch (err) {
    console.error('Error deleting item:', err)
    const errorMessage =
      err instanceof Error ? err.message : 'Unbekannter Fehler'
    toast.error(`Fehler beim Löschen des Artikels: ${errorMessage}`)
  } finally {
    deleteDialog.value.loading = false
  }
}

// Confirm delete wishlist
const confirmDeleteWishlist = () => {
  deleteWishlistDialog.value.open = true
}

// Open edit wishlist modal
const openEditWishlistModal = () => {
  isEditWishlistModalOpen.value = true
}

// Handle wishlist updated
const onWishlistUpdated = (updatedWishlist: Wishlist) => {
  wishlistData.value = updatedWishlist
  toast.success('Wishlist erfolgreich aktualisiert!')
}

// Delete wishlist
const deleteWishlist = async () => {
  if (!wishlistId.value) return

  try {
    deleteWishlistDialog.value.loading = true

    const response = await fetch(`/api/wishlists/${wishlistId.value}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || 'API returned success: false')
    }

    // Show success message
    toast.success('Wishlist erfolgreich gelöscht')

    // Refresh sidebar to remove deleted wishlist
    refreshSidebar?.()

    // Navigate back to wishlists overview
    router.push('/tools/wishlists')

    // Close dialog
    deleteWishlistDialog.value.open = false
  } catch (err) {
    console.error('Error deleting wishlist:', err)
    const errorMessage =
      err instanceof Error ? err.message : 'Unbekannter Fehler'
    toast.error(`Fehler beim Löschen der Wishlist: ${errorMessage}`)
  } finally {
    deleteWishlistDialog.value.loading = false
  }
}

// Watchers
watch(
  wishlistId,
  () => {
    if (wishlistId.value) {
      fetchWishlist()
      fetchItems()
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (wishlistId.value) {
    fetchWishlist()
    fetchItems()
  }
})
</script>

<style scoped>
/* Line clamp utility - modern CSS property with fallback */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Custom scrollbar for overflow areas */
.overflow-hidden::-webkit-scrollbar {
  height: 4px;
}

.overflow-hidden::-webkit-scrollbar-track {
  background: var(--color-muted);
}

.overflow-hidden::-webkit-scrollbar-thumb {
  background: var(--color-muted-foreground);
  border-radius: 2px;
}

.overflow-hidden::-webkit-scrollbar-thumb:hover {
  background: var(--color-foreground);
}

/* Priority stars styling - using CSS variables for theme consistency */
.text-yellow-500 {
  color: var(--color-yellow-500, #eab308);
}

.fill-yellow-500 {
  fill: var(--color-yellow-500, #eab308);
}

/* Responsive adjustments using modern CSS Grid */
@media (max-width: 768px) {
  .grid-cols-12 {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .col-span-1 {
    grid-column: span 1 / span 1;
  }

  .col-span-2 {
    grid-column: span 1 / span 1;
  }

  .col-span-3 {
    grid-column: span 2 / span 2;
  }

  /* Stack actions vertically on mobile */
  .col-span-2:last-child .flex {
    flex-direction: column;
    gap: 0.25rem;
  }
}

/* Enhanced hover states using modern CSS features */
.hover\:bg-muted\/20:hover {
  background-color: color-mix(in srgb, var(--color-muted) 20%, transparent);
}

/* Modern transition using CSS custom properties */
.transition-colors {
  transition-property: color, background-color, border-color;
  transition-timing-function: var(--ease-out, cubic-bezier(0.4, 0, 0.2, 1));
  transition-duration: var(--duration-150, 150ms);
}
</style>
