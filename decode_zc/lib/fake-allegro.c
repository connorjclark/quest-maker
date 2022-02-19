#include <stdlib.h>

/* _al_malloc:
 *  Wrapper for when a program needs to manipulate memory that has been
 *  allocated by the Allegro DLL.
 */
void *_al_malloc(size_t size)
{
  return malloc(size);
}

/* _al_free:
 *  Wrapper for when a program needs to manipulate memory that has been
 *  allocated by the Allegro DLL.
 */
void _al_free(void *mem)
{
  free(mem);
}

int* allegro_errno = NULL;
