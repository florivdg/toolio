<script setup lang="ts">
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@/components/ui/menubar'
import { useColorMode } from '@vueuse/core'
import { signOut } from '@/lib/auth-client'

const { store } = useColorMode()

async function handleSignOut() {
  await signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = '/sign-in' // redirect to login page
      },
    },
  })
}

async function handleNav(path: string) {
  window.location.href = path
}
</script>

<template>
  <Menubar class="rounded-none border-b border-none px-2 lg:px-4">
    <MenubarMenu>
      <MenubarTrigger class="font-bold"> Toolio </MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleNav('/')">Über Toolio</MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          Einstellungen... <MenubarShortcut>⌘,</MenubarShortcut>
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="handleSignOut">
          Toolio beenden <MenubarShortcut>⌘Q</MenubarShortcut>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarTrigger class="relative"> Docs </MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleNav('/docs')"> Übersicht </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="handleNav('/docs/itunes')">
          iTunes Price Watcher
        </MenubarItem>
        <MenubarItem @click="handleNav('/docs/wishlists')">
          Wishlists
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarTrigger> Tools </MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleNav('/tools')"> Übersicht </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="handleNav('/tools/itunes')">
          iTunes Price Watcher
        </MenubarItem>
        <MenubarItem @click="handleNav('/tools/wishlists')">
          Wishlists
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarTrigger> Ansicht </MenubarTrigger>
      <MenubarContent>
        <MenubarLabel inset> Dark Mode </MenubarLabel>
        <MenubarSeparator />
        <MenubarRadioGroup v-model="store">
          <MenubarRadioItem value="light" @click="store = 'light'">
            Light
          </MenubarRadioItem>
          <MenubarRadioItem value="dark" @click="store = 'dark'">
            Dark
          </MenubarRadioItem>
          <MenubarRadioItem value="auto" @click="store = 'auto'">
            System
          </MenubarRadioItem>
        </MenubarRadioGroup>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarTrigger> Account </MenubarTrigger>
      <MenubarContent>
        <MenubarItem @click="handleNav('/account')">
          Account verwalten...
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem @click="handleSignOut"> Abmelden </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
</template>
