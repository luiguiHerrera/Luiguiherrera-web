"""Release admission model caches after each unittest class has finished."""
import unittest

from admission import Git


def clear_git_caches():
    for method in (Git.blob, Git.tree, Git.parents):
        method.cache_clear()


def register_class_cleanups(tests):
    classes = {}

    def collect(items):
        for item in items:
            if isinstance(item, unittest.TestSuite):
                collect(item)
            else:
                classes.setdefault(type(item), None)

    collect(tests)
    for cls in classes:
        # Register before setUpClass: LIFO cleanups added by the fixture run
        # first, while its Git caches are still available, after tearDownClass.
        cls.addClassCleanup(clear_git_caches)


class ClassCleanupLoader(unittest.TestLoader):
    def loadTestsFromNames(self, names, module=None):
        suite = super().loadTestsFromNames(names, module)
        register_class_cleanups(suite)
        return suite


if __name__ == '__main__':
    unittest.main(module=None, testLoader=ClassCleanupLoader())
