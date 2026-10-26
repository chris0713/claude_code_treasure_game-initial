import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../src/components/ui/form';
import { Input } from '../../src/components/ui/input';

// A one-field form whose username is required. Input: optional message children. Output: the form.
function NameForm({ hint, emptyError = false }: { hint?: string; emptyError?: boolean }) {
  const form = useForm({ defaultValues: { username: '' } });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="username"
          rules={{ required: emptyError ? true : 'Username is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Your public name.</FormDescription>
              <FormMessage>{hint}</FormMessage>
            </FormItem>
          )}
        />
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

describe('Form', () => {
  it('links label, control and description, and shows validation errors', async () => {
    const user = userEvent.setup();
    render(<NameForm />);
    const input = screen.getByLabelText('Username');
    const description = screen.getByText('Your public name.');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', description.id);
    expect(document.querySelector('[data-slot="form-message"]')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Save' }));
    const message = await screen.findByText('Username is required');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', `${description.id} ${message.id}`);
    expect(screen.getByText('Username')).toHaveAttribute('data-error', 'true');
  });

  it('shows its own text when there is no error', () => {
    render(<NameForm hint="Pick something fun" />);
    expect(screen.getByText('Pick something fun')).toHaveAttribute('data-slot', 'form-message');
  });

  it('renders nothing for an error without a message', async () => {
    const user = userEvent.setup();
    render(<NameForm emptyError />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true'));
    expect(document.querySelector('[data-slot="form-message"]')).toBeNull();
  });
});
