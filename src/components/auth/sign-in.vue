<script setup lang="ts">
import { reactive } from 'vue'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const form = reactive({
  email: '',
  password: '',
})

async function handleSubmit() {
  try {
    await signIn.email(
      {
        email: form.email,
        password: form.password,
      },
      {
        onSuccess: () => {
          window.location.href = '/' // Redirect to the home page or dashboard
        },
        onError: (error) => {
          console.error('Error:', error)
          // Handle error (e.g., show error message)
        },
      },
    )
  } catch (error) {
    console.error('Sign in failed:', error)
    // Handle sign-in error (e.g., show error message)
  }
}
</script>

<template>
  <Card class="w-full max-w-sm">
    <CardHeader>
      <CardTitle class="text-2xl"> Login </CardTitle>
      <CardDescription>
        Enter your email below to login to your account.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <form @submit.prevent="handleSubmit" class="grid gap-4">
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            type="email"
            v-model="form.email"
            placeholder="m@example.com"
            required
          />
        </div>
        <div class="grid gap-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            type="password"
            v-model="form.password"
            required
          />
        </div>
        <Button type="submit" class="w-full"> Sign in </Button>
      </form>
    </CardContent>
    <CardFooter>
      <p class="text-muted-foreground w-full text-center text-sm">
        Don't have an account?
        <a href="/sign-up" class="font-medium underline underline-offset-4">
          Sign up
        </a>
      </p>
    </CardFooter>
  </Card>
</template>
