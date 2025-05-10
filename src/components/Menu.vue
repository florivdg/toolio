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
</script>

<template>
  <Menubar class="rounded-none border-b border-none px-2 lg:px-4">
    <MenubarMenu>
      <MenubarTrigger class="font-bold"> Toolio </MenubarTrigger>
      <MenubarContent>
        <MenubarItem>Über Toolio</MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          Einstellungen... <MenubarShortcut>⌘,</MenubarShortcut>
        </MenubarItem>
        <MenubarSeparator />
        <MenubarItem>
          Toolio beenden <MenubarShortcut>⌘Q</MenubarShortcut>
        </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarTrigger class="relative"> APIs </MenubarTrigger>
      <MenubarContent>
        <MenubarItem> Übersicht </MenubarItem>
        <MenubarSeparator />
        <MenubarItem> API 1 </MenubarItem>
        <MenubarItem> API 2 </MenubarItem>
        <MenubarItem> API 3 </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarTrigger> Tools </MenubarTrigger>
      <MenubarContent>
        <MenubarItem> Übersicht </MenubarItem>
        <MenubarSeparator />
        <MenubarItem> Tool 1 </MenubarItem>
        <MenubarItem> Tool 2 </MenubarItem>
        <MenubarItem> Tool 3 </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarTrigger> Ansicht </MenubarTrigger>
      <MenubarContent>
        <MenubarLabel inset> Dark Mode </MenubarLabel>
        <MenubarSeparator />
        <MenubarRadioGroup model-value="system">
          <MenubarRadioItem value="light"> Light </MenubarRadioItem>
          <MenubarRadioItem value="dark"> Dark </MenubarRadioItem>
          <MenubarRadioItem value="system"> System </MenubarRadioItem>
        </MenubarRadioGroup>
      </MenubarContent>
    </MenubarMenu>
    <MenubarMenu>
      <MenubarTrigger> Account </MenubarTrigger>
      <MenubarContent>
        <MenubarItem> Account verwalten... </MenubarItem>
        <MenubarSeparator />
        <MenubarItem> Abmelden </MenubarItem>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
</template>
